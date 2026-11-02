import {test} from 'node:test';
import assert from 'node:assert/strict';
import delay from 'delay';
import PCancelable, {CancelError} from './index.js';

const fixture = Symbol('fixture');

test('new PCancelable()', async () => {
	let cancelHandlerCalls = 0;

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			cancelHandlerCalls++;
		});

		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	assert.ok(cancelablePromise instanceof Promise);

	assert.equal(cancelablePromise.isCanceled, false);

	cancelablePromise.cancel();

	await assert.rejects(cancelablePromise, CancelError);

	assert.equal(cancelablePromise.isCanceled, true);
	assert.equal(cancelHandlerCalls, 1);
});

test('calling `.cancel()` multiple times', async () => {
	let cancelHandlerCalls = 0;

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			cancelHandlerCalls++;
		});

		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	cancelablePromise.cancel();
	cancelablePromise.cancel();

	const error = await cancelablePromise.catch(error => error);

	assert.ok(error instanceof CancelError);
	assert.equal(cancelHandlerCalls, 1);
});

test('no `.cancel()` call', async () => {
	let isCancelHandlerCalled = false;

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			isCancelHandlerCalled = true;
		});

		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	assert.equal(await cancelablePromise, fixture);
	assert.equal(isCancelHandlerCalled, false);
});

test('no `onCancel` handler', async () => {
	const cancelablePromise = new PCancelable(resolve => {
		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	cancelablePromise.cancel();

	await assert.rejects(cancelablePromise, CancelError);
});

test('does not do anything when the promise is already settled', async () => {
	let isCancelHandlerCalled = false;

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			isCancelHandlerCalled = true;
		});

		resolve();
	});

	assert.equal(cancelablePromise.isCanceled, false);

	await cancelablePromise;

	cancelablePromise.cancel();

	assert.equal(cancelablePromise.isCanceled, false);
	assert.equal(isCancelHandlerCalled, false);
});

test('PCancelable.fn()', async () => {
	let cancelHandlerCalls = 0;

	const cancelableFunction = PCancelable.fn(async (input, onCancel) => {
		onCancel(() => {
			cancelHandlerCalls++;
		});

		await delay(50);

		return input;
	});

	const cancelablePromise = cancelableFunction(fixture);

	cancelablePromise.cancel();

	await assert.rejects(cancelablePromise, CancelError);
	assert.equal(cancelHandlerCalls, 1);
});

test('PCancelable.CancelError', () => {
	assert.ok(CancelError.prototype instanceof Error);
});

test('rejects when canceled', async () => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {});
	});

	cancelablePromise.cancel();

	await assert.rejects(cancelablePromise, CancelError);
});

test('rejects when canceled after a delay', async () => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {});
	});

	setTimeout(() => {
		cancelablePromise.cancel();
	}, 100);

	await assert.rejects(cancelablePromise, CancelError);
});

test('supports multiple `onCancel` handlers', async () => {
	let cancelHandlerCalls = 0;

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			cancelHandlerCalls++;
		});
		onCancel(() => {
			cancelHandlerCalls++;
		});
		onCancel(() => {
			cancelHandlerCalls++;
		});
	});

	cancelablePromise.cancel();

	await assert.rejects(cancelablePromise, CancelError);

	assert.equal(cancelHandlerCalls, 3);
});

test('cancel error includes a `isCanceled` property', async () => {
	const cancelablePromise = new PCancelable(() => {});
	cancelablePromise.cancel();

	const error = await cancelablePromise.catch(error => error);
	assert.ok(error.isCanceled);
});

test('`onCancel` handler could not be attached after the promise resolved', async () => {
	let onCancel;

	const cancelablePromise = new PCancelable((resolve, reject, cancelHandlerRegistration) => {
		onCancel = cancelHandlerRegistration;

		resolve();
	});

	await cancelablePromise;

	assert.throws(() => {
		onCancel();
	}, {message: 'The `onCancel` handler was attached after the promise resolved.'});
});

test('`onCancel` handler could not be attached after the promise rejected', async () => {
	let onCancel;

	const cancelablePromise = new PCancelable((resolve, reject, cancelHandlerRegistration) => {
		onCancel = cancelHandlerRegistration;

		reject(new Error('some error'));
	});

	await assert.rejects(cancelablePromise, {message: 'some error'});

	assert.throws(() => {
		onCancel();
	}, {message: 'The `onCancel` handler was attached after the promise rejected.'});
});

test('`onCancel` handler could not be attached after the promise canceled', async () => {
	let onCancel;

	const cancelablePromise = new PCancelable((resolve, reject, cancelHandlerRegistration) => {
		onCancel = cancelHandlerRegistration;
	});

	cancelablePromise.cancel();

	await assert.rejects(cancelablePromise, CancelError);

	assert.throws(() => {
		onCancel();
	}, {message: 'The `onCancel` handler was attached after the promise canceled.'});
});

test('supports `finally`', async () => {
	const cancelablePromise = new PCancelable(async resolve => {
		await delay(1);
		resolve();
	});

	let isFinallyHandlerCalled = false;

	await cancelablePromise.finally(() => {
		isFinallyHandlerCalled = true;
	});

	assert.equal(isFinallyHandlerCalled, true);
});

test('default message with no reason', async () => {
	const cancelablePromise = new PCancelable(() => {});
	cancelablePromise.cancel();

	await assert.rejects(cancelablePromise, {message: 'Promise was canceled'});
});

test('custom reason', async () => {
	const cancelablePromise = new PCancelable(() => {});
	cancelablePromise.cancel('unicorn');

	await assert.rejects(cancelablePromise, {message: 'unicorn'});
});

test('prevent rejection', async () => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		setTimeout(resolve, 100);
	});

	cancelablePromise.cancel();
	await cancelablePromise;
	// `cancelablePromise` is canceled before cancelablePromise resolved.
	assert.ok(cancelablePromise.isCanceled);
});

test('prevent rejection and reject later', async () => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		setTimeout(() => reject(new Error('unicorn')), 100);
	});

	cancelablePromise.cancel();
	await assert.rejects(cancelablePromise, {message: 'unicorn'});
	// `cancelablePromise` is canceled before cancelablePromise rejected with unicorn Error.
	assert.ok(cancelablePromise.isCanceled);
});

test('prevent rejection and resolve later', async () => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		setTimeout(() => resolve('unicorn'), 100);
	});

	assert.equal(await cancelablePromise, 'unicorn');
});

test('`onCancel.shouldReject` is true by default', () => {
	let shouldReject;

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		shouldReject = onCancel.shouldReject;
	});

	assert.equal(shouldReject, true);
	assert.equal(cancelablePromise.isCanceled, false);
});

test('throws on cancel when `onCancel.shouldReject` is true', async () => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		onCancel.shouldReject = true;
	});

	cancelablePromise.cancel();

	await assert.rejects(cancelablePromise, CancelError);
});

test('throws immediately as soon as .cancel() is called', async () => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		const timeout = setTimeout(() => {
			resolve(true);
		}, 10);

		onCancel.shouldReject = true;
		onCancel(() => {
			clearTimeout(timeout);
			resolve(false);
		});
	});

	cancelablePromise.cancel();

	await assert.rejects(cancelablePromise, {
		message: 'Promise was canceled',
	});
});

test('does not do anything when the executor threw', async () => {
	let isCancelHandlerRan = false;

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			isCancelHandlerRan = true;
		});

		throw new Error('unicorn');
	});

	await assert.rejects(cancelablePromise, {message: 'unicorn'});

	assert.equal(cancelablePromise.isCanceled, false);

	cancelablePromise.cancel();

	assert.equal(isCancelHandlerRan, false);
});

test('can be canceled while an adopted promise is pending', async () => {
	let isCancelHandlerRan = false;

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			isCancelHandlerRan = true;
		});

		resolve(delay(30, {value: fixture}));
	});

	cancelablePromise.cancel('unicorn');

	assert.equal(cancelablePromise.isCanceled, true);
	assert.equal(isCancelHandlerRan, true);
	await assert.rejects(cancelablePromise, {name: 'CancelError', message: 'unicorn'});
});

test('ignores `resolve` and `reject` calls after resolving with a promise', async () => {
	const cancelablePromise = new PCancelable((resolve, reject) => {
		resolve(delay(30, {value: fixture}));
		resolve('unicorn');
		reject(new Error('unicorn'));
	});

	assert.equal(await cancelablePromise, fixture);
	assert.equal(cancelablePromise.isCanceled, false);
});

test('ignores an executor error after resolving with a promise', async () => {
	const cancelablePromise = new PCancelable(resolve => {
		resolve(delay(30, {value: fixture}));
		throw new Error('unicorn');
	});

	assert.equal(await cancelablePromise, fixture);
});

test('prevent rejection and settle with the adopted promise', async () => {
	let isCancelHandlerRan = false;

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		onCancel(() => {
			isCancelHandlerRan = true;
		});

		resolve(delay(30, {value: fixture}));
	});

	cancelablePromise.cancel();

	assert.equal(cancelablePromise.isCanceled, true);
	assert.equal(isCancelHandlerRan, true);
	assert.equal(await cancelablePromise, fixture);
});

test('rejects with the adopted promise rejection', async () => {
	const cancelablePromise = new PCancelable(resolve => {
		resolve(Promise.reject(new Error('unicorn')));
	});

	await assert.rejects(cancelablePromise, {message: 'unicorn'});

	cancelablePromise.cancel();

	assert.equal(cancelablePromise.isCanceled, false);
});
