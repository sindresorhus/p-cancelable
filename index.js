export class CancelError extends Error {
	constructor(reason) {
		super(reason || 'Promise was canceled');
		this.name = 'CancelError';
	}

	get isCanceled() {
		return true;
	}
}

const promiseState = Object.freeze({
	pending: Symbol('pending'),
	canceled: Symbol('canceled'),
	resolved: Symbol('resolved'),
	rejected: Symbol('rejected'),
});

// TODO: Use private class fields when ESLint 8 is out.

export default class PCancelable {
	static fn(userFunction) {
		return (...arguments_) => new PCancelable((resolve, reject, onCancel) => {
			arguments_.push(onCancel);
			userFunction(...arguments_).then(resolve, reject);
		});
	}

	constructor(executor) {
		this._cancelHandlers = [];
		this._rejectOnCancel = true;
		this._state = promiseState.pending;

		this._promise = new Promise((resolve, reject) => {
			this._reject = reject;

			const onResolve = value => {
				if (this._state !== promiseState.canceled || !onCancel.shouldReject) {
					resolve(value);
					this._state = promiseState.resolved;
				}
			};

			const onReject = error => {
				if (this._state !== promiseState.canceled || !onCancel.shouldReject) {
					reject(error);
					this._state = promiseState.rejected;
				}
			};

			const onCancel = handler => {
				if (this._state !== promiseState.pending) {
					throw new Error(`The \`onCancel\` handler was attached after the promise ${this._state.description}.`);
				}

				this._cancelHandlers.push(handler);
			};

			Object.defineProperties(onCancel, {
				shouldReject: {
					get: () => this._rejectOnCancel,
					set: boolean => {
						this._rejectOnCancel = boolean;
					},
				},
			});

			executor(onResolve, onReject, onCancel);
		});
	}

	then(onFulfilled, onRejected) {
		return this._promise.then(onFulfilled, onRejected);
	}

	catch(onRejected) {
		return this._promise.catch(onRejected);
	}

	finally(onFinally) {
		return this._promise.finally(onFinally);
	}

	cancel(reason) {
		if (this._state !== promiseState.pending) {
			return;
		}

		this._state = promiseState.canceled;

		if (this._cancelHandlers.length > 0) {
			try {
				for (const handler of this._cancelHandlers) {
					handler();
				}
			} catch (error) {
				this._reject(error);
				return;
			}
		}

		if (this._rejectOnCancel) {
			this._reject(new CancelError(reason));
		}
	}

	get isCanceled() {
		return this._state === promiseState.canceled;
	}
}

Object.setPrototypeOf(PCancelable.prototype, Promise.prototype);
