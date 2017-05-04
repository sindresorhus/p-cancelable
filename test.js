import test from 'ava';
import delay from 'delay';
import PCancelable from './';

const fixture = Symbol('fixture');

test('new PCancelable()', async t => {
	t.plan(4);

	const p = new PCancelable((onCancel, resolve) => {
		onCancel(() => {
			t.pass();
		});

		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	t.false(p.canceled);

	p.cancel();

	try {
		await p;
	} catch (err) {
		t.true(err instanceof PCancelable.CancelError);
	}

	t.true(p.canceled);
});

test('calling `.cancel()` multiple times', async t => {
	t.plan(2);

	const p = new PCancelable((onCancel, resolve) => {
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
	} catch (err) {
		p.cancel();
		t.true(err instanceof PCancelable.CancelError);
	}
});

test('no `.cancel()` call', async t => {
	const p = new PCancelable((onCancel, resolve) => {
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

	const p = new PCancelable((onCancel, resolve) => {
		setTimeout(() => {
			resolve(fixture);
		}, 50);
	});

	p.cancel();

	try {
		await p;
	} catch (err) {
		t.true(err instanceof PCancelable.CancelError);
	}
});

test('does not do anything when the promise is already settled', async t => {
	t.plan(2);

	const p = new PCancelable((onCancel, resolve) => {
		onCancel(() => {
			t.fail();
		});

		resolve();
	});

	t.false(p.canceled);

	await p;

	p.cancel();

	t.false(p.canceled);
});

test('PCancelable.fn()', async t => {
	t.plan(2);

	const fn = PCancelable.fn(async (onCancel, input) => {
		onCancel(() => {
			t.pass();
		});

		await delay(50);

		return input;
	});

	const p = fn(fixture);

	p.cancel();

	try {
		await p;
	} catch (err) {
		t.true(err instanceof PCancelable.CancelError);
	}
});

test('PCancelable.CancelError', t => {
	t.true(PCancelable.CancelError.prototype instanceof Error);
});

test.failing('resolves on cancel', async t => {
	const p = new PCancelable(onCancel => {
		onCancel(() => {});
	});
	setTimeout(() => {
		p.cancel();
	}, 100);
	await t.throws(p);
});
