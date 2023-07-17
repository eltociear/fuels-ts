import { generateTestWallet, seedTestWallet } from '@fuel-ts/wallet/test-utils';
import { readFileSync } from 'fs';
import type { TransactionRequestLike, TransactionResponse, TransactionType, JsonAbi } from 'fuels';
import {
  BN,
  getRandomB256,
  bn,
  multiply,
  toHex,
  toNumber,
  Provider,
  Contract,
  transactionRequestify,
  FunctionInvocationResult,
  Wallet,
  ContractFactory,
  ZeroBytes32,
  NativeAssetId,
  FUEL_NETWORK_URL,
  Predicate,
} from 'fuels';
import { join } from 'path';

import abiJSON from '../test-projects/call-test-contract/out/debug/call-test-abi.json';

import { createSetupConfig } from './utils';

const contractBytecode = readFileSync(
  join(__dirname, '../test-projects/call-test-contract/out/debug/call-test.bin')
);

const predicateBytecode = readFileSync(
  join(__dirname, '../test-projects/predicate-true/out/debug/predicate-true.bin')
);

const setupContract = createSetupConfig({
  contractBytecode,
  abi: abiJSON,
});

export const jsonAbiFragmentMock: JsonAbi = {
  configurables: [],
  loggedTypes: [],
  types: [
    {
      typeId: 0,
      type: 'bool',
      components: null,
      typeParameters: null,
    },
    {
      typeId: 1,
      type: 'u64',
      components: null,
      typeParameters: null,
    },
    {
      typeId: 2,
      type: 'struct MyStruct',
      components: [
        {
          type: 0,
          name: 'arg_one',
          typeArguments: null,
        },
        {
          type: 1,
          name: 'arg_two',
          typeArguments: null,
        },
      ],
      typeParameters: null,
    },
  ],
  functions: [
    {
      name: 'main',
      inputs: [
        {
          name: 'my_struct',
          type: 2,
          typeArguments: null,
        },
      ],
      output: {
        name: 'my_struct',
        type: 2,
        typeArguments: null,
      },
      attributes: [],
    },
  ],
};
const jsonFragment: JsonAbi = {
  configurables: [],
  loggedTypes: [],
  types: [
    {
      typeId: 0,
      type: '()',
      components: null,
      typeParameters: null,
    },
    {
      typeId: 1,
      type: 'u64',
      components: null,
      typeParameters: null,
    },
    {
      typeId: 2,
      type: 'struct MyStruct',
      components: [
        {
          type: 0,
          name: 'arg_one',
          typeArguments: null,
        },
        {
          type: 1,
          name: 'arg_two',
          typeArguments: null,
        },
      ],
      typeParameters: null,
    },
  ],
  functions: [
    {
      name: 'entry_one',
      inputs: [
        {
          name: 'arg',
          type: 1,
          typeArguments: null,
        },
      ],
      output: {
        name: '',
        type: 0,
        typeArguments: null,
      },
      attributes: [],
    },
  ],
};

const complexFragment: JsonAbi = {
  configurables: [],
  loggedTypes: [],
  types: [
    {
      typeId: 0,
      type: '()',
      components: null,
      typeParameters: null,
    },
    {
      typeId: 1,
      type: 'str[20]',
      components: null,
      typeParameters: null,
    },
    {
      typeId: 2,
      type: 'b256',
      components: null,
      typeParameters: null,
    },
    {
      typeId: 3,
      type: '(_, _)',
      components: [
        {
          name: '__tuple_element',
          type: 1,
          typeArguments: null,
        },
        {
          name: '__tuple_element',
          type: 2,
          typeArguments: null,
        },
      ],
      typeParameters: null,
    },
  ],
  functions: [
    {
      name: 'tuple_function',
      inputs: [
        {
          name: 'person',
          type: 2,
          typeArguments: null,
        },
      ],
      output: {
        name: '',
        type: 0,
        typeArguments: null,
      },
      attributes: [],
    },
  ],
};

const txPointer = '0x00000000000000000000000000000000';

const AltToken = '0x0101010101010101010101010101010101010101010101010101010101010101';

describe('Contract', () => {
  it('generates function methods on a simple contract', async () => {
    const provider = new Provider('http://127.0.0.1:4000/graphql');
    const spy = jest.spyOn(provider, 'sendTransaction');
    const wallet = await generateTestWallet(provider, [[1_000, NativeAssetId]]);
    const contract = new Contract(ZeroBytes32, jsonFragment, wallet);
    const fragment = contract.interface.getFunction('entry_one');
    const interfaceSpy = jest.spyOn(fragment, 'encodeArguments');

    try {
      await contract.functions.entry_one(42);
    } catch {
      // The call will fail, but it doesn't matter
    }

    expect(spy).toHaveBeenCalled();
    expect(interfaceSpy).toHaveBeenCalled();
  });

  it('generates function methods on a complex contract', async () => {
    const provider = new Provider('http://127.0.0.1:4000/graphql');
    const spy = jest.spyOn(provider, 'sendTransaction');
    const wallet = await generateTestWallet(provider, [[1_000, NativeAssetId]]);
    const contract = new Contract(ZeroBytes32, complexFragment, wallet);
    const fragment = contract.interface.getFunction('tuple_function');
    const interfaceSpy = jest.spyOn(fragment, 'encodeArguments');

    try {
      await contract.functions.tuple_function({
        address: '0xd5579c46dfcc7f18207013e65b44e4cb4e2c2298f4ac457ba8f82743f31e930b',
        name: 'foo',
      });
    } catch {
      // The call will fail, but it doesn't matter
    }

    expect(spy).toHaveBeenCalled();
    expect(interfaceSpy).toHaveBeenCalled();
  });

  it('assigns a provider if passed', () => {
    const provider = new Provider('http://127.0.0.1:4000/graphql');
    const contract = new Contract(getRandomB256(), jsonFragment, provider);

    expect(contract.provider).toEqual(provider);
  });

  it('should fail to execute call if gasLimit is too low', async () => {
    const contract = await setupContract();

    let failed;
    try {
      await contract.functions
        .foo(1336)
        .txParams({
          gasLimit: 1,
        })
        .call();
    } catch (e) {
      failed = true;
    }

    expect(failed).toEqual(true);
  });

  it('adds multiple contracts on invocation', async () => {
    const contract = await setupContract();
    const otherContract = await setupContract({
      cache: false,
    });

    const scope = contract.functions.call_external_foo(1336, otherContract.id);

    const { value: results } = await scope.call();

    expect(results.toHex()).toEqual(toHex(1338));
  });

  it('adds multiple contracts on multicalls', async () => {
    const contract = await setupContract();
    const otherContract = await setupContract({
      cache: false,
    });
    const calls = [
      contract.functions.foo(1336),
      contract.functions.call_external_foo(1336, otherContract.id),
    ];

    const scope = contract.multiCall(calls).addContracts([otherContract]);

    expect(scope.transactionRequest.getContractInputs()).toEqual([
      { contractId: contract.id.toB256(), type: 1, txPointer },
      { contractId: otherContract.id.toB256(), type: 1, txPointer },
    ]);

    expect(scope.transactionRequest.getContractOutputs()).toEqual([
      { type: 1, inputIndex: 0 },
      { type: 1, inputIndex: 1 },
    ]);

    const { value: results } = await scope.call();
    expect(JSON.stringify(results)).toEqual(JSON.stringify([bn(1337), bn(1338)]));
  });

  it('submits multiple calls', async () => {
    const contract = await setupContract();

    const { value: results } = await contract
      .multiCall([contract.functions.foo(1336), contract.functions.foo(1336)])
      .call();
    expect(JSON.stringify(results)).toEqual(JSON.stringify([bn(1337), bn(1337)]));
  });

  it('should fail to execute multiple calls if gasLimit is too low', async () => {
    const contract = await setupContract();

    let failed;
    try {
      await contract
        .multiCall([contract.functions.foo(1336), contract.functions.foo(1336)])
        .txParams({
          gasLimit: 1,
        })
        .call();
    } catch (e) {
      failed = true;
    }

    expect(failed).toEqual(true);
  });

  it('adds multiple contracts on multicalls', async () => {
    const contract = await setupContract();
    const otherContract = await setupContract({ cache: false });

    const scope = contract.multiCall([contract.functions.foo(1336)]).addContracts([otherContract]);

    expect(scope.transactionRequest.getContractInputs()).toEqual([
      { contractId: contract.id.toB256(), type: 1, txPointer },
      { contractId: otherContract.id.toB256(), type: 1, txPointer },
    ]);

    expect(scope.transactionRequest.getContractOutputs()).toEqual([
      { type: 1, inputIndex: 0 },
      { type: 1, inputIndex: 1 },
    ]);

    const { value: results } = await scope.call();
    expect(JSON.stringify(results)).toEqual(JSON.stringify([bn(1337)]));
  });

  it('dryRuns multiple calls', async () => {
    const contract = await setupContract();

    const { value: results } = await contract
      .multiCall([contract.functions.foo(1336), contract.functions.foo(1336)])
      .get();
    expect(JSON.stringify(results)).toEqual(JSON.stringify([bn(1337), bn(1337)]));
  });

  it('simulates multiple calls', async () => {
    const contract = await setupContract();

    const { value, callResult, gasUsed } = await contract
      .multiCall([contract.functions.foo(1336), contract.functions.foo(1336)])
      .simulate();
    expect(JSON.stringify(value)).toEqual(JSON.stringify([bn(1337), bn(1337)]));
    expect(toNumber(gasUsed)).toBeGreaterThan(0);
    expect(callResult.receipts).toEqual(expect.arrayContaining([expect.any(Object)]));
  });

  it('Returns gasUsed and transactionId', async () => {
    const contract = await setupContract();

    const { transactionId, gasUsed } = await contract
      .multiCall([contract.functions.foo(1336), contract.functions.foo(1336)])
      .call();
    expect(transactionId).toBeTruthy();
    expect(toNumber(gasUsed)).toBeGreaterThan(0);
  });

  it('Single call with forwarding a alt token', async () => {
    const contract = await setupContract();
    const { value } = await contract.functions
      .return_context_amount()
      .callParams({
        forward: [200, AltToken],
        gasLimit: 1000000,
      })
      .txParams({
        gasPrice: 1,
        gasLimit: 2000000,
      })
      .call<BN>();
    expect(value.toHex()).toEqual(toHex(200));
  });

  it('MultiCall with multiple forwarding', async () => {
    const contract = await setupContract();

    const { value } = await contract
      .multiCall([
        contract.functions.return_context_amount().callParams({
          forward: [100, NativeAssetId],
        }),
        contract.functions.return_context_amount().callParams({
          forward: [200, AltToken],
        }),
        contract.functions.return_context_asset().callParams({
          forward: [0, AltToken],
        }),
      ])
      .txParams({
        gasPrice: 1,
        gasLimit: 2000000,
      })
      .call<[BN, BN, BN]>();
    expect(JSON.stringify(value)).toEqual(JSON.stringify([bn(100), bn(200), AltToken]));
  });

  it('Check if gas per call is lower than transaction', async () => {
    const contract = await setupContract();

    await expect(
      contract
        .multiCall([
          contract.functions.return_context_amount().callParams({
            forward: [100, NativeAssetId],
            gasLimit: 100,
          }),
          contract.functions.return_context_amount().callParams({
            forward: [200, AltToken],
            gasLimit: 200,
          }),
        ])
        .txParams({
          gasPrice: 1,
          gasLimit: 100,
        })
        .call<[BN, BN, BN]>()
    ).rejects.toThrowError(
      "Transaction gasLimit can't be lower than the sum of the forwarded gas of each call"
    );
  });

  it('can forward gas to multicall calls', async () => {
    const contract = await setupContract();

    const { value } = await contract
      .multiCall([
        contract.functions.return_context_gas().callParams({
          // Forward only 500_000 gas
          gasLimit: 500_000,
        }),
        contract.functions.return_context_gas().callParams({
          // Forward all gas
          gasLimit: 0,
        }),
      ])
      .txParams({
        gasPrice: 1,
        gasLimit: 1_000_000,
      })
      .call<[BN, BN]>();

    // Allow values to be off by 2% since we don't have exact values
    const allowedError = 0.02;

    expect(value[0].toNumber()).toBeGreaterThanOrEqual(500_000 * allowedError);
    expect(value[0].toNumber()).toBeLessThanOrEqual(500_000);

    expect(value[1].toNumber()).toBeGreaterThanOrEqual(1_000_000 * allowedError);
    expect(value[1].toNumber()).toBeLessThanOrEqual(1_000_000);
  });

  it('Get transaction cost', async () => {
    const contract = await setupContract();

    const invocationScope = contract.multiCall([
      contract.functions.return_context_amount().callParams({
        forward: [100, NativeAssetId],
      }),
      contract.functions.return_context_amount().callParams({
        forward: [200, AltToken],
      }),
    ]);
    const transactionCost = await invocationScope.getTransactionCost();

    expect(toNumber(transactionCost.gasPrice)).toBe(0);
    expect(toNumber(transactionCost.fee)).toBeGreaterThanOrEqual(0);
    expect(toNumber(transactionCost.gasUsed)).toBeGreaterThan(1000);

    const { value } = await invocationScope
      .txParams({
        gasPrice: transactionCost.gasPrice,
        gasLimit: transactionCost.gasUsed,
      })
      .call<[string, string]>();

    expect(JSON.stringify(value)).toEqual(JSON.stringify([bn(100), bn(200)]));
  });

  it('Get transaction cost with gasPrice 1', async () => {
    const contract = await setupContract();
    const invocationScope = contract
      .multiCall([
        contract.functions.return_context_amount().callParams({
          forward: [100, NativeAssetId],
        }),
        contract.functions.return_context_amount().callParams({
          forward: [200, AltToken],
        }),
      ])
      .txParams({
        gasPrice: 1,
      });
    // Get transaction cost using gasPrice from
    // invocation scope
    const transactionCost = await invocationScope.getTransactionCost();

    expect(toNumber(transactionCost.gasPrice)).toBe(1);
    expect(toNumber(transactionCost.fee)).toBeGreaterThanOrEqual(1);
    expect(toNumber(transactionCost.gasUsed)).toBeGreaterThan(1000);

    // Test that gasUsed is correctly calculated
    // and can be used as gasLimit
    const { value } = await invocationScope
      .txParams({
        gasPrice: transactionCost.gasPrice,
        gasLimit: transactionCost.gasUsed,
      })
      .call<[string, string]>();

    expect(JSON.stringify(value)).toEqual(JSON.stringify([bn(100), bn(200)]));
  });

  it('Get transaction cost with gasPrice 2', async () => {
    const contract = await setupContract();

    const invocationScope = contract.multiCall([
      contract.functions.return_context_amount().callParams({
        forward: [100, NativeAssetId],
      }),
      contract.functions.return_context_amount().callParams({
        forward: [200, AltToken],
      }),
    ]);
    // Get transaction cost using gasPrice
    // override by SDK user
    const transactionCost = await invocationScope.getTransactionCost({
      gasPrice: 2,
    });

    expect(toNumber(transactionCost.gasPrice)).toBe(2);
    expect(toNumber(transactionCost.fee)).toBeGreaterThanOrEqual(2);
    expect(toNumber(transactionCost.gasUsed)).toBeGreaterThan(1000);

    // Test that gasUsed is correctly calculated
    // and can be used as gasLimit
    const { value } = await invocationScope
      .txParams({
        gasPrice: transactionCost.gasPrice,
        gasLimit: transactionCost.gasUsed,
      })
      .call<[string, string]>();

    expect(JSON.stringify(value)).toEqual(JSON.stringify([bn(100), bn(200)]));
  });

  it('Fail before submit if gasLimit is lower than gasUsed', async () => {
    const contract = await setupContract();

    const invocationScope = contract.functions.return_context_amount().callParams({
      forward: [100, NativeAssetId],
    });
    const { gasUsed } = await invocationScope.getTransactionCost({
      tolerance: 0,
    });

    const gasLimit = multiply(gasUsed, 0.5);
    await expect(
      invocationScope
        .txParams({
          gasLimit,
        })
        .call<BN>()
    ).rejects.toThrowError(`gasLimit(${gasLimit}) is lower than the required (${gasUsed})`);
  });

  it('calls array functions', async () => {
    const contract = await setupContract();

    const { value: arrayBoolean } = await contract.functions
      .take_array_boolean([true, false, false])
      .call();

    expect(arrayBoolean).toEqual(true);

    const { value: arrayNumber } = await contract.functions.take_array_number([1, 2, 3]).call();

    expect(arrayNumber.toHex()).toEqual(toHex(1));

    const { value: arrayReturnShuffle } = await contract.functions
      .take_array_string_shuffle(['abc', 'efg', 'hij'])
      .call();

    expect(arrayReturnShuffle).toEqual(['hij', 'abc', 'efg']);

    const { value: arrayReturnSingle } = await contract.functions
      .take_array_string_return_single(['abc', 'efg', 'hij'])
      .call();

    expect(arrayReturnSingle).toEqual(['abc']);

    const { value: arrayReturnSingleElement } = await contract.functions
      .take_array_string_return_single_element(['abc', 'efg', 'hij'])
      .call();

    expect(arrayReturnSingleElement).toEqual('abc');
  });

  it('calls enum functions', async () => {
    const contract = await setupContract();

    const { value: enumB256ReturnValue } = await contract.functions
      .take_b256_enum({
        Value: '0xd5579c46dfcc7f18207013e65b44e4cb4e2c2298f4ac457ba8f82743f31e930b',
      })
      .call();

    expect(enumB256ReturnValue).toEqual(
      '0xd5579c46dfcc7f18207013e65b44e4cb4e2c2298f4ac457ba8f82743f31e930b'
    );

    const { value: enumB256ReturnData } = await contract.functions
      .take_b256_enum({
        Data: '0x1111111111111111111111111111111111111111111111111111111111111111',
      })
      .call();

    expect(enumB256ReturnData).toEqual(
      '0x1111111111111111111111111111111111111111111111111111111111111111'
    );

    const { value: enumBoolReturnValue } = await contract.functions
      .take_bool_enum({
        Value: true,
      })
      .call();

    expect(enumBoolReturnValue).toEqual(true);

    const { value: enumBoolReturnData } = await contract.functions
      .take_bool_enum({
        Data: false,
      })
      .call();

    expect(enumBoolReturnData).toEqual(false);

    const { value: enumStrReturnValue } = await contract.functions
      .take_string_enum({
        Value: 'abc',
      })
      .call();

    expect(enumStrReturnValue).toEqual('abc');

    const { value: enumStrReturnData } = await contract.functions
      .take_string_enum({
        Data: 'efg',
      })
      .call();

    expect(enumStrReturnData).toEqual('efg');
  });

  it('dryRun and get should not validate the signature', async () => {
    const contract = await setupContract();
    const { value } = await contract
      .multiCall([
        contract.functions.return_context_amount().callParams({
          forward: [100, NativeAssetId],
        }),
        contract.functions.return_context_amount().callParams({
          forward: [200, AltToken],
        }),
      ])
      .dryRun();
    expect(JSON.stringify(value)).toEqual(JSON.stringify([bn(100), bn(200)]));
  });

  it('Parse TX to JSON and parse back to TX', async () => {
    const contract = await setupContract();

    const num = 1337;
    const struct = { a: true, b: 1337 };
    const invocationScopes = [contract.functions.foo(num), contract.functions.boo(struct)];
    const multiCallScope = contract.multiCall(invocationScopes);

    const transactionRequest = await multiCallScope.getTransactionRequest();

    const txRequest = JSON.stringify(transactionRequest);
    const txRequestParsed = JSON.parse(txRequest);

    const transactionRequestParsed = transactionRequestify(txRequestParsed);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const response = await contract.account!.sendTransaction(transactionRequestParsed);
    const {
      value: [resultA, resultB],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = await FunctionInvocationResult.build<any>(invocationScopes, response, true, contract);

    expect(resultA.toHex()).toEqual(bn(num).add(1).toHex());
    expect(resultB.a).toEqual(!struct.a);
    expect(resultB.b.toHex()).toEqual(bn(struct.b).add(1).toHex());
  });

  it('Parse create TX to JSON and parse back to create TX', async () => {
    const wallet = Wallet.generate();
    await seedTestWallet(wallet, [
      {
        amount: bn(1_000_000),
        assetId: NativeAssetId,
      },
    ]);
    const contract = new ContractFactory(contractBytecode, abiJSON, wallet);
    const { transactionRequest } = contract.createTransactionRequest();

    const txRequest = JSON.stringify(transactionRequest);
    const txRequestParsed = JSON.parse(txRequest);

    const transactionRequestParsed = transactionRequestify(txRequestParsed);

    // Fund tx
    await wallet.fund(transactionRequestParsed);
    // Send tx
    const response = await wallet.sendTransaction(transactionRequestParsed);
    const result = await response.waitForResult();
    expect(result.status).toBe('success');
  });

  it('Provide a custom provider and public wallet to the contract instance', async () => {
    const contract = await setupContract();
    const externalWallet = Wallet.generate();
    await seedTestWallet(externalWallet, [
      {
        amount: bn(1_000_000),
        assetId: NativeAssetId,
      },
    ]);

    // Create a custom provider to emulate a external signer
    // like Wallet Extension or a Hardware wallet
    let signedTransaction;
    class ProviderCustom extends Provider {
      async sendTransaction(
        transactionRequestLike: TransactionRequestLike
      ): Promise<TransactionResponse> {
        const transactionRequest = transactionRequestify(transactionRequestLike);
        // Simulate a external request of signature
        signedTransaction = await externalWallet.signTransaction(transactionRequest);
        transactionRequest.updateWitnessByOwner(externalWallet.address, signedTransaction);
        return super.sendTransaction(transactionRequestLike);
      }
    }

    // Set custom provider to contract instance
    const customProvider = new ProviderCustom('http://127.0.0.1:4000/graphql');
    contract.account = Wallet.fromAddress(externalWallet.address, customProvider);
    contract.provider = customProvider;

    const num = 1337;
    const struct = { a: true, b: 1337 };
    const invocationScopes = [contract.functions.foo(num), contract.functions.boo(struct)];
    const multiCallScope = contract.multiCall(invocationScopes);

    const transactionRequest = await multiCallScope.getTransactionRequest();

    const txRequest = JSON.stringify(transactionRequest);
    const txRequestParsed = JSON.parse(txRequest);

    const transactionRequestParsed = transactionRequestify(txRequestParsed);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const response = await contract.account!.sendTransaction(transactionRequestParsed);
    const {
      value: [resultA, resultB],
      transactionResult,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = await FunctionInvocationResult.build<any, TransactionType.Script>(
      invocationScopes,
      response,
      true,
      contract
    );

    expect(transactionResult.transaction.witnesses.length).toEqual(1);
    expect(transactionResult.transaction.witnesses[0].data).toEqual(signedTransaction);
    expect(resultA.toHex()).toEqual(bn(num).add(1).toHex());
    expect(resultB.a).toEqual(!struct.a);
    expect(resultB.b.toHex()).toEqual(bn(struct.b).add(1).toHex());
  });

  it('Read only call', async () => {
    const contract = await setupContract();
    const { value } = await contract.functions.echo_b256(contract.id.toB256()).get();
    expect(value).toEqual(contract.id.toB256());
  });

  /**
   * NOTE: The following E2E tests are related to the `Account` class method `transferToContract`.
   * A deployed contract is required for their execution, which is why they are
   * currently placed inside the `fuel-gauge` package. It might make sense
   * to move them to another test suite when addressing https://github.com/FuelLabs/fuels-ts/issues/1043.
   */
  it('should tranfer asset to a deployed contract just fine (NATIVE ASSET)', async () => {
    const provider = new Provider(FUEL_NETWORK_URL);
    const wallet = await generateTestWallet(provider, [[500, NativeAssetId]]);

    const contract = await setupContract();

    const initialBalance = new BN(await contract.getBalance(NativeAssetId)).toNumber();

    const amountToContract = 200;

    const tx = await wallet.transferToContract(contract.id, amountToContract);

    await tx.waitForResult();

    const finalBalance = new BN(await contract.getBalance(NativeAssetId)).toNumber();

    expect(finalBalance).toBe(initialBalance + amountToContract);
  });

  it('should tranfer asset to a deployed contract just fine (NOT NATIVE ASSET)', async () => {
    const asset = '0x0101010101010101010101010101010101010101010101010101010101010101';
    const provider = new Provider(FUEL_NETWORK_URL);
    const wallet = await generateTestWallet(provider, [
      [500, NativeAssetId],
      [200, asset],
    ]);

    const contract = await setupContract();

    const initialBalance = new BN(await contract.getBalance(asset)).toNumber();

    const amountToContract = 100;

    const tx = await wallet.transferToContract(contract.id, amountToContract, asset);

    await tx.waitForResult();

    const finalBalance = new BN(await contract.getBalance(asset)).toNumber();

    expect(finalBalance).toBe(initialBalance + amountToContract);
  });

  it('should tranfer asset to a deployed contract just fine (FROM PREDICATE)', async () => {
    const provider = new Provider(FUEL_NETWORK_URL);
    const wallet = await generateTestWallet(provider, [[500, NativeAssetId]]);

    const contract = await setupContract();

    const initialBalance = new BN(await contract.getBalance(NativeAssetId)).toNumber();

    const amountToContract = 200;
    const amountToPredicate = 300;

    const chainId = await provider.getChainId();

    const predicate = new Predicate(predicateBytecode, chainId);

    const tx1 = await wallet.transfer(predicate.address, amountToPredicate);

    await tx1.waitForResult();

    const tx2 = await predicate.transferToContract(contract.id, amountToContract);

    await tx2.waitForResult();

    const finalBalance = new BN(await contract.getBalance(NativeAssetId)).toNumber();

    expect(finalBalance).toBe(initialBalance + amountToContract);
  });
});
