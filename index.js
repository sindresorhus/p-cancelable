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
		this._pending = true;
		this._canceled = false;

		this._promise = new Promise((resolve, reject) => {
			this._reject = reject;

			return executor(
				fn => {
					this._cancelHandlers.push(fn);
				},
				val => {
					this._pending = false;
					resolve(val);
				},
				err => {
					this._pending = false;
					reject(err);
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
		if (!this._pending || this._canceled) {
			return;
		}

		if (this._cancelHandlers.length > 0) {
			try {
				for (const fn of this._cancelHandlers) {
					fn();
				}
			} catch (err) {
				this._reject(err);
			}
		}

		this._canceled = true;
		this._reject(new CancelError());
	}

	get canceled() {
		return this._canceled;
	}
}

Object.setPrototypeOf(PCancelable.prototype, Promise.prototype);

module.exports = PCancelable;
module.exports.CancelError = CancelError;
