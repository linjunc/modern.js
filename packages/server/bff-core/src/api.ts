import 'reflect-metadata';
import compose from 'koa-compose';
import type {
  ApiRunner,
  ArrayToObject,
  ExtractInputType,
  MetadataHelper,
  ExecuteHelper,
  Operator,
  MaybeAsync,
} from './types';
import { validateFunction, HANDLER_WITH_META } from './utils';

interface Runner {
  (inputs: any): Promise<any>;
  [HANDLER_WITH_META]: boolean;
}

type NextFunction = () => void;

export function Api<
  Operators extends Operator<any>[],
  Res extends MaybeAsync<any>,
>(
  ...args: [
    ...operators: Operators,
    handler: (arg: ArrayToObject<ExtractInputType<Operators>>) => Res,
  ]
): ApiRunner<
  ExtractInputType<Operators> extends void[]
    ? void
    : ArrayToObject<ExtractInputType<Operators>>,
  Res
> {
  const handler = args.pop() as (...args: any) => any;
  validateFunction(handler, 'Apihandler');

  const operators = args as Operator<any>[];
  const metadataHelper: MetadataHelper = {
    getMetadata(key: any) {
      return Reflect.getMetadata(key, runner);
    },
    setMetadata(key: any, value: any) {
      return Reflect.defineMetadata(key, value, runner);
    },
  };

  for (const operator of operators) {
    if (operator.metadata) {
      operator.metadata(metadataHelper);
    }
  }

  const validateHandlers = operators
    .filter(operator => operator.validate)
    .map(operator => operator.validate!);

  async function runner(inputs: any) {
    const executeHelper: ExecuteHelper = {
      result: null,
      get inputs() {
        return inputs;
      },
    };

    const stack = [...validateHandlers];

    stack.push(async (helper: ExecuteHelper, next: NextFunction) => {
      const res = await handler(inputs);
      helper.result = res;
      return next();
    });

    await compose(stack)(executeHelper);

    return executeHelper.result;
  }

  (runner as Runner)[HANDLER_WITH_META] = true;

  return runner as any;
}
