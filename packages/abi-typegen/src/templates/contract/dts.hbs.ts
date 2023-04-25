export default `{{header}}

{{#if imports}}
import type {
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


interface {{capitalizedName}}Interface extends Interface {
  functions: {
    {{#each functionsFragments}}
    {{this}}: FunctionFragment;
    {{/each}}
  };

  {{#each encoders}}
  encodeFunctionData(functionFragment: '{{functionName}}', values: [{{input}}]): Uint8Array;
  {{/each}}

  {{#each decoders}}
  decodeFunctionData(functionFragment: '{{functionName}}', data: BytesLike): DecodedValue;
  {{/each}}
}


export class {{capitalizedName}} extends Contract {
  interface: {{capitalizedName}}Interface;
  functions: {
    {{#each functionsTypedefs}}
    {{this}};
    {{/each}}
  };
}
`;
