export default `{{header}}

{{#if imports}}
import {
{{#each imports}}
  {{this}},
{{/each}}
} from 'fuels';
{{/if}}

{{#if commonTypesInUse}}
import type { {{commonTypesInUse}} } from "./common";
{{/if}}


{{#each enums}}
{{#if inputNativeValues}}
export enum {{structName}}Input { {{inputNativeValues}} };
{{else}}
export type {{structName}}Input = Enum<{ {{inputValues}} }>;
{{/if}}
{{#if outputNativeValues}}
export enum {{structName}}Output { {{outputNativeValues}} };
{{else}}
  {{#if recycleRef}}
export type {{structName}}Output = {{structName}}Input;
  {{else}}
export type {{structName}}Output = Enum<{ {{outputValues}} }>;
  {{/if}}
{{/if}}
{{/each}}


{{#each structs}}
export type {{structName}}Input{{typeAnnotations}} = { {{inputValues}} };
{{#if recycleRef}}
export type {{structName}}Output{{typeAnnotations}} = {{structName}}Input{{typeAnnotations}};
{{else}}
export type {{structName}}Output{{typeAnnotations}} = { {{outputValues}} };
{{/if}}
{{/each}}

type {{capitalizedName}}Inputs = [{{inputs}}];
type {{capitalizedName}}Output = {{output}};

const _abi = {{abiJsonString}}

const _bin = '{{hexlifiedBinString}}'

export class {{capitalizedName}}__factory {

  static readonly abi = _abi
  static readonly bin = _bin

  static createInstance(wallet: Account) {

    const { abi, bin } = {{capitalizedName}}__factory

    const script = new Script<
      {{capitalizedName}}Inputs,
      {{capitalizedName}}Output
    >(bin, abi, wallet);

    return script;

  }

}
`;
