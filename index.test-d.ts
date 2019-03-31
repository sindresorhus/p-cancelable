import {expectType} from 'tsd';
import PCancelable = require('.');
import {OnCancelFunction, CancelError} from '.';

const cancelablePromise: PCancelable<number> = new PCancelable(
	(resolve, reject, onCancel) => {
		resolve(1);
		resolve(Promise.resolve(1));

		reject();
		reject('foo');

		expectType<OnCancelFunction>(onCancel);
		onCancel(() => 'foo');
		onCancel.shouldReject = false;
	}
);

cancelablePromise.cancel();
cancelablePromise.cancel('foo');
expectType<boolean>(cancelablePromise.isCanceled);

const function0 = PCancelable.fn(onCancel => {
	expectType<OnCancelFunction>(onCancel);

	return Promise.resolve(10);
});
expectType<() => PCancelable<number>>(function0);

const function1 = PCancelable.fn(
	(parameter1: string, onCancel: OnCancelFunction) => Promise.resolve(10)
);
expectType<(parameter1: string) => PCancelable<number>>(function1);

const function2 = PCancelable.fn(
	(parameter1: string, parameter2: boolean, onCancel: OnCancelFunction) =>
		Promise.resolve(10)
);
expectType<(parameter1: string, parameter2: boolean) => PCancelable<number>>(
	function2
);

const function3 = PCancelable.fn(
	(
		parameter1: string,
		parameter2: boolean,
		parameter3: number,
		onCancel: OnCancelFunction
	) => {
		return Promise.resolve(10);
	}
);
expectType<
	(
		parameter1: string,
		parameter2: boolean,
		parameter3: number
	) => PCancelable<number>
>(function3);

const function4 = PCancelable.fn(
	(
		parameter1: string,
		parameter2: boolean,
		parameter3: number,
		parameter4: symbol,
		onCancel: OnCancelFunction
	) => {
		return Promise.resolve(10);
	}
);
expectType<
	(
		parameter1: string,
		parameter2: boolean,
		parameter3: number,
		parameter4: symbol
	) => PCancelable<number>
>(function4);

const function5 = PCancelable.fn(
	(
		parameter1: string,
		parameter2: boolean,
		parameter3: number,
		parameter4: symbol,
		parameter5: null,
		onCancel: OnCancelFunction
	) => {
		return Promise.resolve(10);
	}
);
expectType<
	(
		parameter1: string,
		parameter2: boolean,
		parameter3: number,
		parameter4: symbol,
		parameter5: null
	) => PCancelable<number>
>(function5);

const cancelError = new CancelError();
new CancelError('foo');

expectType<CancelError>(cancelError);
expectType<'CancelError'>(cancelError.name);
expectType<true>(cancelError.isCanceled);
