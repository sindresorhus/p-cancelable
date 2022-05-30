const test = require('ava');
const delay = require('delay');
const PCancelable = require('./index.js');

const fixture = Symbol('fixture');

test('new PCancelable()', async t => {
	t.plan(5);

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			t.pass();
		});

		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	t.true(cancelablePromise instanceof Promise);

	t.false(cancelablePromise.isCanceled);

	cancelablePromise.cancel();

	await t.throwsAsync(cancelablePromise, {instanceOf: PCancelable.CancelError});

	t.true(cancelablePromise.isCanceled);
});

test('calling `.cancel()` multiple times', async t => {
	t.plan(2);

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			t.pass();
		});

		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	cancelablePromise.cancel();
	cancelablePromise.cancel();

	try {
		await cancelablePromise;
	} catch (error) {
		cancelablePromise.cancel();
		t.true(error instanceof PCancelable.CancelError);
	}
});

test('no `.cancel()` call', async t => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			t.fail();
		});

		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	t.is(await cancelablePromise, fixture);
});

test('no `onCancel` handler', async t => {
	t.plan(1);

	const cancelablePromise = new PCancelable(resolve => {
		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	cancelablePromise.cancel();

	await t.throwsAsync(cancelablePromise, {instanceOf: PCancelable.CancelError});
});

test('does not do anything when the promise is already settled', async t => {
	t.plan(2);

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			t.fail();
		});

		resolve();
	});

	t.false(cancelablePromise.isCanceled);

	await cancelablePromise;

	cancelablePromise.cancel();

	t.false(cancelablePromise.isCanceled);
});

test('PCancelable.fn()', async t => {
	t.plan(2);

	const cancelableFunction = PCancelable.fn(async (input, onCancel) => {
		onCancel(() => {
			t.pass();
		});

		await delay(50);

		return input;
	});

	const cancelablePromise = cancelableFunction(fixture);

	cancelablePromise.cancel();

	await t.throwsAsync(cancelablePromise, {instanceOf: PCancelable.CancelError});
});

test('PCancelable.CancelError', t => {
	t.true(PCancelable.CancelError.prototype instanceof Error);
});

test('rejects when canceled', async t => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {});
	});

	cancelablePromise.cancel();

	await t.throwsAsync(cancelablePromise, {instanceOf: PCancelable.CancelError});
});

test('rejects when canceled after a delay', async t => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {});
	});

	setTimeout(() => {
		cancelablePromise.cancel();
	}, 100);

	await t.throwsAsync(cancelablePromise, {instanceOf: PCancelable.CancelError});
});

test('supports multiple `onCancel` handlers', async t => {
	let i = 0;

	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => i++);
		onCancel(() => i++);
		onCancel(() => i++);
	});

	cancelablePromise.cancel();

	try {
		await cancelablePromise;
	} catch {}

	t.is(i, 3);
});

test('cancel error includes a `isCanceled` property', async t => {
	const cancelablePromise = new PCancelable(() => {});
	cancelablePromise.cancel();

	const error = await t.throwsAsync(cancelablePromise);
	t.true(error.isCanceled);
});

test('`onCancel` handler could not be attached after the promise resolved', async t => {
	const promiseState = 'resolved';
	const errorMessage = `The \`onCancel\` handler was attached after the promise ${promiseState}.`;

	// eslint-disable-next-line no-async-promise-executor
	const testPromise = new Promise(async testResolve => {
		const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
			resolve();

			setTimeout(() => {
				try {
					onCancel();
				} catch (error) {
					testResolve(error);
				}
			}, 0);
		});

		await cancelablePromise;
	});

	const {message} = await testPromise;
	t.is(message, errorMessage);
});

test('`onCancel` handler could not be attached after the promise rejected', async t => {
	const promiseState = 'rejected';
	const errorMessage = `The \`onCancel\` handler was attached after the promise ${promiseState}.`;

	// eslint-disable-next-line no-async-promise-executor
	const testPromise = new Promise(async testResolve => {
		const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
			reject(new Error('some error'));

			setTimeout(() => {
				try {
					onCancel();
				} catch (error) {
					testResolve(error);
				}
			}, 0);
		});

		await t.throwsAsync(cancelablePromise, {message: 'some error'});
	});

	const {message} = await testPromise;
	t.is(message, errorMessage);
});

test('`onCancel` handler could not be attached after the promise canceled', async t => {
	const promiseState = 'canceled';
	const errorMessage = `The \`onCancel\` handler was attached after the promise ${promiseState}.`;

	// eslint-disable-next-line no-async-promise-executor
	const testPromise = new Promise(async testResolve => {
		const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
			onCancel.shouldReject = false;

			setTimeout(() => {
				try {
					onCancel();
				} catch (error) {
					testResolve(error);
				}
			}, 0);
		});

		cancelablePromise.cancel();

		await cancelablePromise;
	});

	const {message} = await testPromise;
	t.is(message, errorMessage);
});

test('supports `finally`', async t => {
	const cancelablePromise = new PCancelable(async resolve => {
		await delay(1);
		resolve();
	});

	t.plan(1);

	try {
		await cancelablePromise;
	} finally {
		t.pass();
	}
});

test('default message with no reason', async t => {
	const cancelablePromise = new PCancelable(() => {});
	cancelablePromise.cancel();

	await t.throwsAsync(cancelablePromise, {message: 'Promise was canceled'});
});

test('custom reason', async t => {
	const cancelablePromise = new PCancelable(() => {});
	cancelablePromise.cancel('unicorn');

	await t.throwsAsync(cancelablePromise, {message: 'unicorn'});
});

test('prevent rejection', async t => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		setTimeout(resolve, 100);
	});

	cancelablePromise.cancel();
	await t.notThrowsAsync(cancelablePromise);
});

test('prevent rejection and reject later', async t => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		setTimeout(() => reject(new Error('unicorn')), 100);
	});

	cancelablePromise.cancel();
	await t.throwsAsync(cancelablePromise, {message: 'unicorn'});
});

test('prevent rejection and resolve later', async t => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		setTimeout(() => resolve('unicorn'), 100);
	});

	t.is(await cancelablePromise, 'unicorn');
});

test('`onCancel.shouldReject` is true by default', async t => {
	await t.notThrows(() => new PCancelable((resolve, reject, onCancel) => {
		t.true(onCancel.shouldReject);
	}));
});

test('throws on cancel when `onCancel.shouldReject` is true', async t => {
	const cancelablePromise = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		onCancel.shouldReject = true;
	});
	cancelablePromise.cancel();

	await t.throwsAsync(cancelablePromise);
});

test('throws immediately as soon as .cancel() is called', async t => {
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

	await t.throwsAsync(cancelablePromise, {
		message: 'Promise was canceled',
	});
});
