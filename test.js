import test from 'ava';
import delay from 'delay';
import promiseFinally from 'promise.prototype.finally';
import PCancelable from '.';

promiseFinally.shim();

const fixture = Symbol('fixture');

test('new PCancelable()', async t => {
	t.plan(5);

	const p = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			t.pass();
		});

		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	t.true(p instanceof Promise);

	t.false(p.isCanceled);

	p.cancel();

	await t.throws(p, PCancelable.CancelError);

	t.true(p.isCanceled);
});

test('calling `.cancel()` multiple times', async t => {
	t.plan(2);

	const p = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			t.pass();
		});

		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	p.cancel();
	p.cancel();

	try {
		await p;
	} catch (error) {
		p.cancel();
		t.true(error instanceof PCancelable.CancelError);
	}
});

test('no `.cancel()` call', async t => {
	const p = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			t.fail();
		});

		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	t.is(await p, fixture);
});

test('no `onCancel` handler', async t => {
	t.plan(1);

	const p = new PCancelable(resolve => {
		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	p.cancel();

	await t.throws(p, PCancelable.CancelError);
});

test('does not do anything when the promise is already settled', async t => {
	t.plan(2);

	const p = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {
			t.fail();
		});

		resolve();
	});

	t.false(p.isCanceled);

	await p;

	p.cancel();

	t.false(p.isCanceled);
});

test('PCancelable.fn()', async t => {
	t.plan(2);

	const fn = PCancelable.fn(async (input, onCancel) => {
		onCancel(() => {
			t.pass();
		});

		await delay(50);

		return input;
	});

	const p = fn(fixture);

	p.cancel();

	await t.throws(p, PCancelable.CancelError);
});

test('PCancelable.CancelError', t => {
	t.true(PCancelable.CancelError.prototype instanceof Error);
});

test('rejects when canceled', async t => {
	const p = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {});
	});

	p.cancel();

	await t.throws(p, PCancelable.CancelError);
});

test('rejects when canceled after a delay', async t => {
	const p = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => {});
	});

	setTimeout(() => {
		p.cancel();
	}, 100);

	await t.throws(p, PCancelable.CancelError);
});

test('supports multiple `onCancel` handlers', async t => {
	let i = 0;

	const p = new PCancelable((resolve, reject, onCancel) => {
		onCancel(() => i++);
		onCancel(() => i++);
		onCancel(() => i++);
	});

	p.cancel();

	try {
		await p;
	} catch (_) {}

	t.is(i, 3);
});

test('cancel error includes a `isCanceled` property', async t => {
	const p = new PCancelable(() => {});
	p.cancel();

	const err = await t.throws(p);
	t.true(err.isCanceled);
});

test.cb('supports `finally`', t => {
	const p = new PCancelable(async resolve => {
		await delay(1);
		resolve();
	});

	p.finally(() => {
		t.end();
	});
});

test('default message with no reason', async t => {
	const p = new PCancelable(() => {});
	p.cancel();

	await t.throws(p, 'Promise was canceled');
});

test('custom reason', async t => {
	const p = new PCancelable(() => {});
	p.cancel('unicorn');

	await t.throws(p, 'unicorn');
});

test('prevent rejection', async t => {
	const p = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		setTimeout(resolve, 100);
	});

	p.cancel();
	await t.notThrows(p);
});

test('prevent rejection and reject later', async t => {
	const p = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		setTimeout(() => reject(new Error('unicorn')), 100);
	});

	p.cancel();
	await t.throws(p, 'unicorn');
});

test('prevent rejection and resolve later', async t => {
	const p = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		setTimeout(() => resolve('unicorn'), 100);
	});

	t.is(await p, 'unicorn');
});

test('`onCancel.shouldReject` is true by default', async t => {
	await t.notThrows(() => new PCancelable((resolve, reject, onCancel) => {
		t.true(onCancel.shouldReject);
	}));
});

test('throws on cancel when `onCancel.shouldReject` is true', async t => {
	const p = new PCancelable((resolve, reject, onCancel) => {
		onCancel.shouldReject = false;
		onCancel.shouldReject = true;
	});
	p.cancel();

	await t.throws(p);
});
