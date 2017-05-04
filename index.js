'use strict';

class CancelError extends Error {
	constructor() {
		super('Promise was canceled');
		this.name = 'CancelError';
	}
}

class PCancelable extends Promise {
	static fn(fn) {
		return function () {
			const args = [].slice.apply(arguments);
			return new PCancelable((onCancel, resolve, reject) => {
				args.unshift(onCancel);
				fn.apply(null, args).then(resolve, reject);
			});
		};
	}

	constructor(executor) {
		super(() => {});

		const _state = {
			pending: true
		};

		let _reject;
		let _cancel;

		this._promise = new Promise((resolve, reject) => {
			_reject = reject;

			return executor(
				fn => {
					_cancel = fn;
				},
				val => {
					_state.pending = false;
					resolve(val);
				},
				err => {
					_state.pending = false;
					reject(err);
				}
			);
		});

		this._state = _state;
		this._reject = _reject;
		this._cancel = _cancel;
		this._canceled = false;
	}

	then() {
		return this._promise.then.apply(this._promise, arguments);
	}

	catch() {
		return this._promise.catch.apply(this._promise, arguments);
	}

	cancel() {
		if (!this._state.pending || this._canceled) {
			return;
		}

		if (typeof this._cancel === 'function') {
			try {
				this._cancel();
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

module.exports = PCancelable;
module.exports.CancelError = CancelError;
