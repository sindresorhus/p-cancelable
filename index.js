'use strict';

class CancelError extends Error {
	constructor() {
		super('Promise was canceled');
		this.name = 'CancelError';
	}
}

class PCancelable {
	static fn(userFn) {
		return function () {
			const args = [].slice.apply(arguments);
			return new PCancelable((onCancel, resolve, reject) => {
				args.unshift(onCancel);
				userFn.apply(null, args).then(resolve, reject);
			});
		};
	}

	constructor(executor) {
		this._cancelHandlers = [];
		this._isPending = true;
		this._isCanceled = false;

		this._promise = new Promise((resolve, reject) => {
			this._reject = reject;

			return executor(
				handler => {
					this._cancelHandlers.push(handler);
				},
				value => {
					this._isPending = false;
					resolve(value);
				},
				error => {
					this._isPending = false;
					reject(error);
				}
			);
		});
	}

	then(onFulfilled, onRejected) {
		return this._promise.then(onFulfilled, onRejected);
	}

	catch(onRejected) {
		return this._promise.catch(onRejected);
	}

	cancel() {
		if (!this._isPending || this._isCanceled) {
			return;
		}

		if (this._cancelHandlers.length > 0) {
			try {
				for (const handler of this._cancelHandlers) {
					handler();
				}
			} catch (err) {
				this._reject(err);
			}
		}

		this._isCanceled = true;
		this._reject(new CancelError());
	}

	get isCanceled() {
		return this._isCanceled;
	}
}

Object.setPrototypeOf(PCancelable.prototype, Promise.prototype);

module.exports = PCancelable;
module.exports.CancelError = CancelError;
