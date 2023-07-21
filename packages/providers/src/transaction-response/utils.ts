import { arrayify, hexlify } from '@ethersproject/bytes';
import type { BN } from '@fuel-ts/math';
import { bn } from '@fuel-ts/math';
import type { Input, Output, Transaction } from '@fuel-ts/transactions';
import { TransactionType, InputType, ReceiptType, ReceiptCoder } from '@fuel-ts/transactions';

import type { GqlReceiptFragmentFragment } from '../__generated__/operations';
import { getFunctionCall } from '../transaction-summary/call';
import {
  getInputContractFromIndex,
  getInputFromAssetId,
  getInputsCoin,
} from '../transaction-summary/input';
import {
  getOutputsCoin,
  getOutputsContract,
  getOutputsContractCreated,
} from '../transaction-summary/output';
import { calculateTransactionFee } from '../utils';

import type {
  TransactionResultReceipt,
  TransactionResultCallReceipt,
  TransactionResultMessageOutReceipt,
  TransactionResultTransferOutReceipt,
} from './transaction-response';
import type {
  AbiParam,
  BlockId,
  GetOperationParams,
  GqlTransactionStatusesNames,
  GqlTransaction,
  InputOutputParam,
  InputParam,
  Operation,
  OperationCoin,
  RawPayloadParam,
  ReceiptParam,
  Time,
  TransactionSummary,
} from './types';
import {
  AddressType,
  ChainName,
  OperationName,
  SimplifiedTransactionStatusNameEnum,
  TransactionTypeNameEnum,
} from './types';

export const getTransactionStatusName = (gqlStatus: GqlTransactionStatusesNames) => {
  switch (gqlStatus) {
    case 'FailureStatus':
      return SimplifiedTransactionStatusNameEnum.failure;
    case 'SuccessStatus':
      return SimplifiedTransactionStatusNameEnum.success;
    case 'SubmittedStatus':
      return SimplifiedTransactionStatusNameEnum.submitted;
    case 'SqueezedOutStatus':
      return SimplifiedTransactionStatusNameEnum.squeezedout;
    default:
      throw new Error('Unknown transaction status');
  }
};

export function getTransactionTypeName(transactionType: TransactionType): TransactionTypeNameEnum {
  switch (transactionType) {
    case TransactionType.Mint:
      return TransactionTypeNameEnum.Mint;
    case TransactionType.Create:
      return TransactionTypeNameEnum.Create;
    case TransactionType.Script:
      return TransactionTypeNameEnum.Script;
    default:
      throw new Error('Unknown transaction type');
  }
}
export function isType(transactionType: TransactionType, type: TransactionTypeNameEnum) {
  const txType = getTransactionTypeName(transactionType);

  return txType === type;
}

export function isTypeMint(transactionType: TransactionType) {
  return isType(transactionType, TransactionTypeNameEnum.Mint);
}

export function isTypeCreate(transactionType: TransactionType) {
  return isType(transactionType, TransactionTypeNameEnum.Create);
}

export function isTypeScript(transactionType: TransactionType) {
  return isType(transactionType, TransactionTypeNameEnum.Script);
}

export function getReceiptsByType<T = TransactionResultReceipt>(
  receipts: TransactionResultReceipt[],
  type: ReceiptType
) {
  return (receipts ?? []).filter((r) => r.type === type) as T[];
}

export function getReceiptsCall(receipts: TransactionResultReceipt[]) {
  return getReceiptsByType<TransactionResultCallReceipt>(receipts, ReceiptType.Call);
}

export function getReceiptsMessageOut(receipts: TransactionResultReceipt[]) {
  return getReceiptsByType<TransactionResultMessageOutReceipt>(receipts, ReceiptType.MessageOut);
}

export function getInputAccountAddress(input: Input) {
  if (input.type === InputType.Coin) {
    return input.owner.toString();
  }

  if (input.type === InputType.Message) {
    return input.recipient.toString();
  }

  return '';
}

function isSameOperation(a: Operation, b: Operation) {
  return (
    a.name === b.name &&
    a.from?.address === b.from?.address &&
    a.to?.address === b.to?.address &&
    a.from?.type === b.from?.type &&
    a.to?.type === b.to?.type
  );
}

function hasSameAssetId(a: OperationCoin) {
  return (b: OperationCoin) => a.assetId === b.assetId;
}

const mergeAssets = (op1: Operation, op2: Operation) => {
  const assets1 = op1.assetsSent || [];
  const assets2 = op2.assetsSent || [];
  const filtered = assets2.filter((c) => !assets1.some(hasSameAssetId(c)));
  return assets1
    .map((coin) => {
      const asset = assets2.find(hasSameAssetId(coin));
      if (!asset) return coin;
      return { ...coin, amount: bn(coin.amount).add(asset.amount) };
    })
    .concat(filtered);
};

export function addOperation(operations: Operation[], toAdd: Operation) {
  const ops = operations
    .map((op) => {
      // if it's not same operation, don't change. we just wanna stack the same operation
      if (!isSameOperation(op, toAdd)) return null;

      let newOp = { ...op };

      // if it's adding new assets
      if (toAdd.assetsSent?.length) {
        // if prev op had assets, merge them. Otherwise just add the new assets
        newOp = {
          ...newOp,
          assetsSent: op.assetsSent?.length ? mergeAssets(op, toAdd) : toAdd.assetsSent,
        };
      }

      // if it's adding new calls,
      if (toAdd.calls?.length) {
        /*
[]          for calls we don't stack as grouping is not desired.
          we wanna show all calls in the same operation
          with each respective assets, amounts, functions, arguments.
        */
        newOp = {
          ...newOp,
          calls: [...(op.calls || []), ...(toAdd.calls || [])],
        };
      }

      return newOp;
    })
    .filter(Boolean) as Operation[];

  // if this operation didn't exist before just add it to the end
  return ops.length ? ops : [...operations, toAdd];
}

export function getContractCreatedOperations({ inputs, outputs }: InputOutputParam): Operation[] {
  const contractCreatedOutputs = getOutputsContractCreated(outputs);
  const input = getInputsCoin(inputs)[0];
  const fromAddress = getInputAccountAddress(input);
  const contractCreatedOperations = contractCreatedOutputs.reduce((prev, contractCreatedOutput) => {
    const operations = addOperation(prev, {
      name: OperationName.contractCreated,
      from: {
        type: AddressType.account,
        address: fromAddress,
      },
      to: {
        type: AddressType.contract,
        address: contractCreatedOutput?.contractId || '',
      },
    });

    return operations;
  }, [] as Operation[]);

  return contractCreatedOperations;
}

export function getReceiptsTransferOut(receipts: TransactionResultReceipt[]) {
  return getReceiptsByType<TransactionResultTransferOutReceipt>(receipts, ReceiptType.TransferOut);
}

export function getTransferOperations({ inputs, outputs }: InputOutputParam): Operation[] {
  const coinOutputs = getOutputsCoin(outputs);

  let operations: Operation[] = [];
  coinOutputs.forEach((output) => {
    const input = getInputFromAssetId(inputs, output.assetId);

    if (input) {
      const inputAddress = getInputAccountAddress(input);
      operations = addOperation(operations, {
        name: OperationName.transfer,
        from: {
          type: AddressType.account,
          address: inputAddress,
        },
        to: {
          type: AddressType.account,
          address: output.to.toString(),
        },
        assetsSent: [
          {
            assetId: output.assetId.toString(),
            amount: output.amount,
          },
        ],
      });
    }
  });

  return operations;
}

export function getPayProducerOperations(outputs: Output[]): Operation[] {
  const coinOutputs = getOutputsCoin(outputs);
  const payProducerOperations = coinOutputs.reduce((prev, output) => {
    const operations = addOperation(prev, {
      name: OperationName.payBlockProducer,
      from: {
        type: AddressType.account,
        address: 'Network',
      },
      to: {
        type: AddressType.account,
        address: output.to.toString(),
      },
      assetsSent: [
        {
          assetId: output.assetId.toString(),
          amount: output.amount,
        },
      ],
    });

    return operations;
  }, [] as Operation[]);

  return payProducerOperations;
}

export function getContractCallOperations({
  inputs,
  outputs,
  receipts,
  abiMap,
  rawPayload,
}: InputOutputParam & ReceiptParam & AbiParam & RawPayloadParam): Operation[] {
  const contractCallReceipts = getReceiptsCall(receipts);
  const contractOutputs = getOutputsContract(outputs);

  const contractCallOperations = contractOutputs.reduce((prevOutputCallOps, output) => {
    const contractInput = getInputContractFromIndex(inputs, output.inputIndex);

    if (contractInput) {
      const newCallOps = contractCallReceipts.reduce((prevContractCallOps, receipt) => {
        if (receipt.to === contractInput.contractID) {
          const input = getInputFromAssetId(inputs, receipt.assetId);
          if (input) {
            const inputAddress = getInputAccountAddress(input);
            const calls = [];

            const abi = abiMap?.[contractInput.contractID];
            if (abi) {
              calls.push(
                getFunctionCall({
                  abi,
                  receipt,
                  rawPayload,
                })
              );
            }

            const newContractCallOps = addOperation(prevContractCallOps, {
              name: OperationName.contractCall,
              from: {
                type: AddressType.account,
                address: inputAddress,
              },
              to: {
                type: AddressType.contract,
                address: receipt.to,
              },
              // if no amount is forwarded to the contract, skip showing assetsSent
              assetsSent: receipt.amount?.isZero()
                ? undefined
                : [
                    {
                      amount: receipt.amount,
                      assetId: receipt.assetId,
                    },
                  ],
              calls,
            });

            return newContractCallOps;
          }
        }
        return prevContractCallOps;
      }, prevOutputCallOps as Operation[]);

      return newCallOps;
    }

    return prevOutputCallOps;
  }, [] as Operation[]);

  return contractCallOperations;
}

export function getContractTransferOperations({ receipts }: ReceiptParam): Operation[] {
  const transferOutReceipts = getReceiptsTransferOut(receipts);

  const contractTransferOperations = transferOutReceipts.reduce(
    (prevContractTransferOps, receipt) => {
      const newContractTransferOps = addOperation(prevContractTransferOps, {
        name: OperationName.contractTransfer,
        from: {
          type: AddressType.contract,
          address: receipt.from,
        },
        to: {
          type: AddressType.account,
          address: receipt.to,
        },
        assetsSent: [
          {
            amount: receipt.amount,
            assetId: receipt.assetId,
          },
        ],
      });

      return newContractTransferOps;
    },
    [] as Operation[]
  );

  return contractTransferOperations;
}

export function getWithdrawFromFuelOperations({
  inputs,
  receipts,
}: InputParam & ReceiptParam): Operation[] {
  const messageOutReceipts = getReceiptsMessageOut(receipts);

  const withdrawFromFuelOperations = messageOutReceipts.reduce(
    (prevWithdrawFromFuelOps, receipt) => {
      // TODO: replace this hardcode with receipt.assetId when assetId gets added to MessageOutReceipt
      const assetId = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const input = getInputFromAssetId(inputs, assetId);
      if (input) {
        const inputAddress = getInputAccountAddress(input);
        const newWithdrawFromFuelOps = addOperation(prevWithdrawFromFuelOps, {
          name: OperationName.withdrawFromFuel,
          from: {
            type: AddressType.account,
            address: inputAddress,
          },
          to: {
            type: AddressType.account,
            address: receipt.recipient.toString(),
            chain: ChainName.ethereum,
          },
          assetsSent: [
            {
              amount: receipt.amount,
              assetId,
            },
          ],
        });

        return newWithdrawFromFuelOps;
      }

      return prevWithdrawFromFuelOps;
    },
    [] as Operation[]
  );

  return withdrawFromFuelOperations;
}

export function getOperations({
  transactionType,
  inputs,
  outputs,
  receipts,
  abiMap,
  rawPayload,
}: GetOperationParams): Operation[] {
  if (isTypeCreate(transactionType)) {
    return [
      ...getContractCreatedOperations({ inputs, outputs }),
      ...getTransferOperations({ inputs, outputs }),
    ];
  }

  if (isTypeMint(transactionType)) {
    return [...getPayProducerOperations(outputs)];
  }

  if (isTypeScript(transactionType)) {
    return [
      ...getTransferOperations({ inputs, outputs }),
      ...getContractCallOperations({
        inputs,
        outputs,
        receipts,
        abiMap,
        rawPayload,
      }),
      ...getContractTransferOperations({ receipts }),
      ...getWithdrawFromFuelOperations({ inputs, receipts }),
    ];
  }
  return [];
}

export const processGqlReceipt = (
  gqlReceipt: GqlReceiptFragmentFragment
): TransactionResultReceipt => {
  const receipt = new ReceiptCoder().decode(arrayify(gqlReceipt.rawPayload), 0)[0];

  switch (receipt.type) {
    case ReceiptType.ReturnData: {
      return {
        ...receipt,
        data: gqlReceipt.data!,
      };
    }
    case ReceiptType.LogData: {
      return {
        ...receipt,
        data: gqlReceipt.data!,
      };
    }
    default:
      return receipt;
  }
};

export interface IParseGqlTransaction {
  gqlTransaction: GqlTransaction;
  gasPerByte: BN;
  gasPriceFactor: BN;
}

export function getTransactionSummary<TTransactionType = void>(params: {
  id?: string;
  gasPrice: BN;
  gasPerByte?: BN;
  gasPriceFactor?: BN;
  transaction: Transaction;
  transactionBytes: Uint8Array;
  gqlTransactionStatus?: GqlTransaction['status'];
  receipts: TransactionResultReceipt[];
}) {
  const {
    receipts,
    gasPerByte,
    gasPrice,
    gasPriceFactor,
    transaction,
    transactionBytes,
    id,
    gqlTransactionStatus,
  } = params;

  const { gasUsed, fee } = calculateTransactionFee({
    receipts,
    gasPrice,
    gasPerByte,
    gasPriceFactor,
    transactionBytes,
    transactionType: transaction.type,
    transactionWitnesses: transaction?.witnesses || [],
  });

  const operations = getOperations({
    transactionType: transaction.type,
    inputs: transaction.inputs || [],
    outputs: transaction.outputs || [],
    receipts,
    rawPayload: hexlify(transactionBytes),
    // abiMap, TODO: update this when it's possible to get a contract JsonAbi using graphql
  });

  const typeName = getTransactionTypeName(transaction.type);

  let time: Time;
  let blockId: BlockId | undefined;
  let status: SimplifiedTransactionStatusNameEnum | undefined;

  let isStatusFailure = false;
  let isStatusSuccess = false;
  let isStatusPending = false;

  if (gqlTransactionStatus?.type) {
    status = getTransactionStatusName(gqlTransactionStatus.type);

    switch (gqlTransactionStatus.type) {
      case 'SuccessStatus':
        time = gqlTransactionStatus.time;
        blockId = gqlTransactionStatus.block.id;
        isStatusSuccess = true;
        break;

      case 'FailureStatus':
        time = gqlTransactionStatus.time;
        blockId = gqlTransactionStatus.block.id;
        isStatusFailure = true;
        break;

      case 'SubmittedStatus':
        time = gqlTransactionStatus.time;
        isStatusPending = true;
        break;
      default:
    }
  }

  const transactionSummary: TransactionSummary<TTransactionType> = {
    id,
    fee,
    gasUsed,
    operations,
    type: typeName,
    blockId,
    time,
    status,
    receipts,
    isTypeMint: isTypeMint(transaction.type),
    isTypeCreate: isTypeCreate(transaction.type),
    isTypeScript: isTypeScript(transaction.type),
    isStatusFailure,
    isStatusSuccess,
    isStatusPending,
    transaction: transaction as Transaction<TTransactionType>,
  };

  return transactionSummary;
}
