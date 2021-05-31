import {expectType} from 'tsd';
import PCancelable, {OnCancelFunction, CancelError} from './index.js';

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

const function0 = PCancelable.fn(async onCancel => {
	expectType<OnCancelFunction>(onCancel);

	return Promise.resolve(10);
});
expectType<() => PCancelable<number>>(function0);

const function1 = PCancelable.fn(
	async (_parameter1: string, _onCancel: OnCancelFunction) => Promise.resolve(10)
);
expectType<(parameter1: string) => PCancelable<number>>(function1);

const function2 = PCancelable.fn(
	async (_parameter1: string, _parameter2: boolean, _onCancel: OnCancelFunction) =>
		Promise.resolve(10)
);
expectType<(_parameter1: string, _parameter2: boolean) => PCancelable<number>>(
	function2
);

const function3 = PCancelable.fn(
	async (
		_parameter1: string,
		_parameter2: boolean,
		_parameter3: number,
		_onCancel: OnCancelFunction
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
	async (
		_parameter1: string,
		_parameter2: boolean,
		_parameter3: number,
		_parameter4: symbol,
		_onCancel: OnCancelFunction
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
	async (
		_parameter1: string,
		_parameter2: boolean,
		_parameter3: number,
		_parameter4: symbol,
		_parameter5: null,
		_onCancel: OnCancelFunction
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
new CancelError('foo'); // eslint-disable-line no-new

expectType<CancelError>(cancelError);
expectType<'CancelError'>(cancelError.name);
expectType<true>(cancelError.isCanceled);
