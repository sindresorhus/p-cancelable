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

export default class PCancelable {
	static fn(userFunction) {
		return (...arguments_) => new PCancelable((resolve, reject, onCancel) => {
			arguments_.push(onCancel);
			// Not `.then(…).catch(…)`: `resolve` and `reject` are this package's own wrappers, which
			// check the cancel state. A `.catch(…)` would also catch a `resolve` that threw.
			// eslint-disable-next-line unicorn/prefer-then-catch
			userFunction(...arguments_).then(resolve, reject);
		});
	}

	#cancelHandlers = [];
	#rejectOnCancel = true;
	#state = promiseState.pending;
	#promise;
	#reject;

	constructor(executor) {
		this.#promise = new Promise((resolve, reject) => {
			this.#reject = reject;

			const onResolve = value => {
				if (this.#state === promiseState.canceled && onCancel.shouldReject) {
					return;
				}

				resolve(value);
				this.#setState(promiseState.resolved);
			};

			const onReject = error => {
				if (this.#state === promiseState.canceled && onCancel.shouldReject) {
					return;
				}

				reject(error);
				this.#setState(promiseState.rejected);
			};

			const onCancel = handler => {
				if (this.#state !== promiseState.pending) {
					throw new Error(`The \`onCancel\` handler was attached after the promise ${this.#state.description}.`);
				}

				this.#cancelHandlers.push(handler);
			};

			Object.defineProperties(onCancel, {
				shouldReject: {
					get: () => this.#rejectOnCancel,
					set: boolean => {
						this.#rejectOnCancel = boolean;
					},
				},
			});

			try {
				executor(onResolve, onReject, onCancel);
			} catch (error) {
				// The `Promise` constructor rejects with this, so mirror what `onReject` does and
				// leave the promise settled. Otherwise `cancel()` still sees it as pending.
				this.#setState(promiseState.rejected);
				throw error;
			}
		});
	}

	#setState(state) {
		if (this.#state === promiseState.pending) {
			this.#state = state;
		}
	}

	/* eslint-disable unicorn/no-thenable, unicorn/prefer-then-catch -- `PCancelable` is documented as a `Promise` subclass, so it has to forward the two-argument `Promise#then` contract. */
	then(onFulfilled, onRejected) {
		return this.#promise.then(onFulfilled, onRejected);
	}
	/* eslint-enable unicorn/no-thenable, unicorn/prefer-then-catch */

	catch(onRejected) {
		return this.#promise.catch(onRejected);
	}

	finally(onFinally) {
		return this.#promise.finally(onFinally);
	}

	cancel(reason) {
		if (this.#state !== promiseState.pending) {
			return;
		}

		this.#setState(promiseState.canceled);

		if (this.#cancelHandlers.length > 0) {
			try {
				for (const handler of this.#cancelHandlers) {
					handler();
				}
			} catch (error) {
				this.#reject(error);
				return;
			}
		}

		if (this.#rejectOnCancel) {
			this.#reject(new CancelError(reason));
		}
	}

	get isCanceled() {
		return this.#state === promiseState.canceled;
	}
}

// `PCancelable` is documented as a `Promise` subclass, so it must inherit from `Promise.prototype`.
// eslint-disable-next-line unicorn/no-top-level-side-effects
Object.setPrototypeOf(PCancelable.prototype, Promise.prototype);
