import type { BytesLike } from '@ethersproject/bytes';
import { hexlify } from '@ethersproject/bytes';
import { ZeroBytes32 } from '@fuel-ts/address/configs';
import type { TransactionCreate } from '@fuel-ts/transactions';
import { TransactionType, OutputType } from '@fuel-ts/transactions';

import type { ContractCreatedTransactionRequestOutput } from './output';
import type { TransactionRequestStorageSlot } from './storage-slot';
import { storageSlotify } from './storage-slot';
import { BaseTransactionRequest } from './transaction-request';
import type { BaseTransactionRequestLike } from './transaction-request';

export interface CreateTransactionRequestLike extends BaseTransactionRequestLike {
  /** Witness index of contract bytecode to create */
  bytecodeWitnessIndex?: number;
  /** Salt */
  salt?: BytesLike;
  /** List of storage slots to initialize */
  storageSlots?: TransactionRequestStorageSlot[];
}

export class CreateTransactionRequest extends BaseTransactionRequest {
  static from(obj: CreateTransactionRequestLike) {
    if (obj instanceof this) {
      return obj;
    }
    return new this(obj);
  }

  /** Type of the transaction */
  type = TransactionType.Create as const;
  /** Witness index of contract bytecode to create */
  bytecodeWitnessIndex: number;
  /** Salt */
  salt: string;
  /** List of storage slots to initialize */
  storageSlots: TransactionRequestStorageSlot[];

  constructor({
    bytecodeWitnessIndex,
    salt,
    storageSlots,
    ...rest
  }: CreateTransactionRequestLike = {}) {
    super(rest);
    this.bytecodeWitnessIndex = bytecodeWitnessIndex ?? 0;
    this.salt = hexlify(salt ?? ZeroBytes32);
    this.storageSlots = [...(storageSlots ?? [])];
  }

  toTransaction(): TransactionCreate {
    const baseTransaction = this.getBaseTransaction();
    const bytecodeWitnessIndex = this.bytecodeWitnessIndex;
    const storageSlots = this.storageSlots?.map(storageSlotify) ?? [];
    return {
      type: TransactionType.Create,
      ...baseTransaction,
      bytecodeLength: baseTransaction.witnesses[bytecodeWitnessIndex].dataLength / 4,
      bytecodeWitnessIndex,
      storageSlotsCount: storageSlots.length,
      salt: this.salt ? hexlify(this.salt) : ZeroBytes32,
      storageSlots,
    };
  }

  getContractCreatedOutputs(): ContractCreatedTransactionRequestOutput[] {
    return this.outputs.filter(
      (output): output is ContractCreatedTransactionRequestOutput =>
        output.type === OutputType.ContractCreated
    );
  }

  addContractCreatedOutput(
    /** Contract ID */
    contractId: BytesLike,
    /** State Root */
    stateRoot: BytesLike
  ) {
    this.pushOutput({
      type: OutputType.ContractCreated,
      contractId,
      stateRoot,
    });
  }
}
