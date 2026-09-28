/* eslint-disable unicorn/consistent-boolean-name -- `parameter2` is a positional argument name, not a predicate. */
import {expectTypeOf} from 'nz';
import PCancelable, {type OnCancelFunction, CancelError} from './index.js';

const cancelablePromise = new PCancelable<number>(
	(resolve, reject, onCancel) => {
		resolve(1);
		resolve(Promise.resolve(1));

		reject();
		reject('foo');

		expectTypeOf(onCancel).toBe<OnCancelFunction>();
		onCancel(() => {
			expectTypeOf(onCancel).toBe<OnCancelFunction>();
		});
		onCancel.shouldReject = false;
	},
);

cancelablePromise.cancel();
cancelablePromise.cancel('foo');
expectTypeOf(cancelablePromise.isCanceled).toBe<boolean>();

const function0 = PCancelable.fn(async onCancel => {
	expectTypeOf(onCancel).toBe<OnCancelFunction>();

	return 10;
});
expectTypeOf(function0).toBe<() => PCancelable<number>>();

const function1 = PCancelable.fn(
	async (_parameter1: string, _onCancel: OnCancelFunction) => 10,
);
expectTypeOf(function1).toBe<(parameter1: string) => PCancelable<number>>();

const function2 = PCancelable.fn(
	async (_parameter1: string, _parameter2: boolean, _onCancel: OnCancelFunction) => 10,
);
expectTypeOf(
	function2,
).toBe<(_parameter1: string, _parameter2: boolean) => PCancelable<number>>();

const function3 = PCancelable.fn(
	async (
		_parameter1: string,
		_parameter2: boolean,
		_parameter3: number,
		_onCancel: OnCancelFunction,
	) => 10,
);
expectTypeOf(function3).toBe<
	(
		parameter1: string,
		parameter2: boolean,
		parameter3: number,
	) => PCancelable<number>>();

const function4 = PCancelable.fn(
	async (
		_parameter1: string,
		_parameter2: boolean,
		_parameter3: number,
		_parameter4: symbol,
		_onCancel: OnCancelFunction,
	) => 10,
);
expectTypeOf(function4).toBe<
	(
		parameter1: string,
		parameter2: boolean,
		parameter3: number,
		parameter4: symbol,
	) => PCancelable<number>>();

const function5 = PCancelable.fn(
	async (
		_parameter1: string,
		_parameter2: boolean,
		_parameter3: number,
		_parameter4: symbol,
		_parameter5: undefined,
		_onCancel: OnCancelFunction,
	) => 10,
);
expectTypeOf(function5).toBe<
	(
		parameter1: string,
		parameter2: boolean,
		parameter3: number,
		parameter4: symbol,
		parameter5: undefined,
	) => PCancelable<number>>();

const cancelError = new CancelError();
new CancelError('foo'); // eslint-disable-line no-new

expectTypeOf(cancelError).toBe<CancelError>();
expectTypeOf(cancelError.name).toBe<'CancelError'>();
expectTypeOf(cancelError.isCanceled).toBe<true>();
