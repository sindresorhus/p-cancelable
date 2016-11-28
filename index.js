'use strict';

class CancelError extends Error {
	constructor() {
		super();
		this.name = 'CancelError';
	}
}

class PCancelable extends Promise {
	constructor(executor) {
		let _reject;
		let _cancel;

		const _state = {
			resolved: false
		};

		super((resolve, reject) => {
			_reject = reject;

			return executor(
				fn => {
					_cancel = fn;
				},
				val => {
					resolve(val);
					_state.resolved = true;
				},
				err => {
					reject(err);
					_state.resolved = true;
				}
			);
		});

		this._reject = _reject;
		this._cancel = _cancel;
		this._state = _state;
		this._canceled = false;
	}
	static fn(fn) {
		return function () {
			const args = [].slice.apply(arguments);
			return new PCancelable((onCancel, resolve, reject) => {
				args.unshift(onCancel);
				fn.apply(null, args).then(resolve, reject);
			});
		};
	}
	cancel() {
		if (this._state.resolved || this._canceled) {
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
