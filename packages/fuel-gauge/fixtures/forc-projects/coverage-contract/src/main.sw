contract;

use std::*;
use core::*;
use std::storage::*;
use std::contract_id::ContractId;
use std::vec::Vec;
use std::option::Option;
use std::assert::assert;
use std::logging::log;
use std::b512::B512;

pub struct U8Struct {
    i: u8,
}

pub struct B256Struct {
    i: b256,
}

pub struct U32Struct {
    foo: u32,
}

pub struct BigStruct {
    foo: u8,
    bar: u8,
}

pub struct ComplexStruct {
    foo: u8,
    bar: u64,
    baz: str[9],
}

pub enum SmallEnum {
    Empty: (),
}

pub enum BigEnum {
    AddressA: b256,
    AddressB: b256,
    AddressC: b256,
}

pub enum ColorEnum {
    Red: (),
    Green: (),
    Blue: (),
}

abi CoverageContract {
    fn produce_logs_variables();
    fn get_id() -> b256;
    fn get_small_string() -> str[8];
    fn get_large_string() -> str[9];
    fn get_u32_struct() -> U32Struct;
    fn get_large_struct() -> BigStruct;
    fn get_large_array() -> [u32; 2];
    fn get_empty_enum() -> SmallEnum;
    fn get_contract_id() -> ContractId;
    fn get_some_option_u8() -> Option<u8>;
    fn get_none_option_u8() -> Option<u8>;
    fn check_u8_vector(vector: Vec<u8>) -> bool;
    fn echo_u8(input: u8) -> u8;
    fn echo_u8_addition(input_a: u8, input_b: u8, input_c: u8) -> u8;
    fn echo_u16(input: u16) -> u16;
    fn echo_u32(input: u32) -> u32;
    fn echo_u64(input: u64) -> u64;
    fn echo_bool(input: bool) -> bool;
    fn echo_b256(input: b256) -> b256;
    fn echo_b512(input: B512) -> B512;
    fn echo_str_1(input: str[1]) -> str[1];
    fn echo_str_2(input: str[2]) -> str[2];
    fn echo_str_3(input: str[3]) -> str[3];
    fn echo_str_8(input: str[8]) -> str[8];
    fn echo_str_9(input: str[9]) -> str[9];
    fn echo_tuple_u8(input: (u8, u8)) -> (u8, u8);
    fn echo_tuple_u64(input: (u64, u64)) -> (u64, u64);
    fn echo_tuple_mixed(input: (bool, u64)) -> (bool, u64);
    fn echo_array_u8(input: [u8; 2]) -> [u8; 2];
    fn echo_array_u64(input: [u64; 5]) -> [u64; 5];
    fn echo_array_bool(input: [bool; 2]) -> [bool; 2];
    fn echo_struct_u8(input: U8Struct) -> U8Struct;
    fn echo_struct_b256(input: B256Struct) -> B256Struct;
    fn echo_enum_small(input: SmallEnum) -> SmallEnum;
    fn echo_enum_big(input: BigEnum) -> BigEnum;
    fn echo_option_u8(input: Option<u8>) -> Option<u8>;
    fn echo_option_extract_u32(input: Option<u32>) -> u32;
    fn echo_option_three_u8(inputA: Option<u8>, inputB: Option<u8>, inputC: Option<u8>) -> u8;
    fn echo_u8_vector_first(vector: Vec<u8>) -> u8;
    fn echo_u8_option_vector_first(vector: Vec<Option<u8>>) -> u8;
    fn echo_u64_vector_last(vector: Vec<u64>) -> u64;
    fn echo_u32_vector_addition_other_type(vector: Vec<u32>, input: u32) -> u32;
    fn echo_u32_vector_addition(vector_1: Vec<u32>, vector_2: Vec<u32>) -> u32;
    fn echo_struct_vector_first(vector: Vec<BigStruct>) -> BigStruct;
    fn echo_struct_vector_last(vector: Vec<ComplexStruct>) -> ComplexStruct;
    fn get_u64_vector() -> raw_slice;
    fn echo_u8_vector(input: Vec<u8>) -> raw_slice;
    fn echo_u64_vector(input: Vec<u64>) -> raw_slice;
    fn color_enum(input: ColorEnum) -> ColorEnum;
    fn vec_as_only_param(input: Vec<u64>) -> (u64, Option<u64>, Option<u64>, Option<u64>);
    fn u32_and_vec_params(foo: u32, input: Vec<u64>) -> (u64, Option<u64>, Option<u64>, Option<u64>);
    fn vec_in_vec(arg: Vec<Vec<u32>>);
    fn vec_in_array(arg: [Vec<u32>; 2]);
}

pub fn vec_from(vals: [u32; 3]) -> Vec<u32> {
    let mut vec = Vec::new();
    vec.push(vals[0]);
    vec.push(vals[1]);
    vec.push(vals[2]);
    vec
}

impl Eq for Vec<u32> {
    fn eq(self, other: Self) -> bool {
        if self.len() != other.len() {
            return false;
        }
        let mut i = 0;
        while i < self.len() {
            if self.get(i).unwrap() != other.get(i).unwrap() {
                return false;
            }
            i += 1;
        }
        true
    }
}

impl Eq for Vec<Vec<u32>> {
    fn eq(self, other: Self) -> bool {
        if self.len() != other.len() {
            return false;
        }
        let mut i = 0;
        while i < self.len() {
            if self.get(i).unwrap() != other.get(i).unwrap() {
                return false;
            }
            i += 1;
        }
        true
    }
}

impl Eq for [Vec<u32>; 2] {
    fn eq(self, other: Self) -> bool {
        let mut i = 0;
        while i < 2 {
            if self[i] != other[i] {
                return false;
            }
            i += 1;
        }
        true
    }
}

impl CoverageContract for Contract {
    fn produce_logs_variables() -> () {
        let f: u64 = 64;
        let u: b256 = 0xef86afa9696cf0dc6385e2c407a6e159a1103cefb7e2ae0636fb33d3cb2a9e4a;
        let e: str[4] = "Fuel";
        let l: [u8; 3] = [1u8, 2u8, 3u8];

        log(f);
        log(u);
        log(e);
        log(l);
    }

    fn get_id() -> b256 {
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
    }

    fn get_small_string() -> str[8] {
        let my_string: str[8] = "gggggggg";
        my_string
    }

    fn get_large_string() -> str[9] {
        let my_string: str[9] = "ggggggggg";
        my_string
    }

    fn get_u32_struct() -> U32Struct {
        U32Struct { foo: 100 }
    }

    fn get_large_struct() -> BigStruct {
        BigStruct {
            foo: 12,
            bar: 42,
        }
    }

    fn get_large_array() -> [u32; 2] {
        let x: [u32; 2] = [1, 2];
        x
    }

    fn get_empty_enum() -> SmallEnum {
        SmallEnum::Empty
    }

    fn get_contract_id() -> ContractId {
        let id = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
        ContractId::from(id)
    }

    fn get_some_option_u8() -> Option<u8> {
        let o: Option<u8> = Option::Some(113);
        o
    }

    fn get_none_option_u8() -> Option<u8> {
        let o: Option<u8> = Option::None;
        o
    }

    fn check_u8_vector(vector: Vec<u8>) -> bool {
        match vector.len() {
            0 => false,
            length => {
                assert(length == 5);
                assert(vector.capacity() == 5);
                assert(vector.is_empty() == false);
                log("vector.items");
                log(vector.get(0));
                log(vector.get(1));
                log(vector.get(2));
                log(vector.get(3));
                log(vector.get(4));
                log("vector.len");
                log(vector.len);
                true
            },
        }
    }

    fn echo_u8(input: u8) -> u8 {
        input
    }

    fn echo_u8_addition(input_a: u8, input_b: u8, input_c: u8) -> u8 {
        input_a + input_b + input_c
    }

    fn echo_u16(input: u16) -> u16 {
        input
    }
    fn echo_u32(input: u32) -> u32 {
        input
    }
    fn echo_u64(input: u64) -> u64 {
        input
    }
    fn echo_bool(input: bool) -> bool {
        input
    }
    fn echo_b256(input: b256) -> b256 {
        input
    }
    fn echo_b512(input: B512) -> B512 {
        input
    }
    fn echo_str_1(input: str[1]) -> str[1] {
        input
    }
    fn echo_str_2(input: str[2]) -> str[2] {
        input
    }
    fn echo_str_3(input: str[3]) -> str[3] {
        input
    }
    fn echo_str_8(input: str[8]) -> str[8] {
        input
    }
    fn echo_str_9(input: str[9]) -> str[9] {
        input
    }
    fn echo_tuple_u8(input: (u8, u8)) -> (u8, u8) {
        input
    }
    fn echo_tuple_u64(input: (u64, u64)) -> (u64, u64) {
        input
    }
    fn echo_tuple_mixed(input: (bool, u64)) -> (bool, u64) {
        input
    }
    fn echo_array_u8(input: [u8; 2]) -> [u8; 2] {
        input
    }
    fn echo_array_u64(input: [u64; 5]) -> [u64; 5] {
        input
    }
    fn echo_array_bool(input: [bool; 2]) -> [bool; 2] {
        input
    }
    fn echo_struct_u8(input: U8Struct) -> U8Struct {
        input
    }
    fn echo_struct_b256(input: B256Struct) -> B256Struct {
        input
    }
    fn echo_enum_small(input: SmallEnum) -> SmallEnum {
        input
    }
    fn echo_enum_big(input: BigEnum) -> BigEnum {
        input
    }
    fn echo_option_u8(input: Option<u8>) -> Option<u8> {
        input
    }
    fn echo_option_extract_u32(input: Option<u32>) -> u32 {
        match input {
            Option::Some(value) => value,
            Option::None => 500u32,
        }
    }
    fn echo_option_three_u8(inputA: Option<u8>, inputB: Option<u8>, inputC: Option<u8>) -> u8 {
        let value1 = match inputA {
            Option::Some(value) => value,
            Option::None => 0,
        };
        let value2 = match inputB {
            Option::Some(value) => value,
            Option::None => 0,
        };
        let value3 = match inputC {
            Option::Some(value) => value,
            Option::None => 0,
        };

        value1 + value2 + value3
    }

    fn echo_u8_vector_first(vector: Vec<u8>) -> u8 {
        match vector.get(0) {
            Option::Some(val) => val,
            Option::None => 0,
        }
    }

    fn echo_u8_option_vector_first(vector: Vec<Option<u8>>) -> u8 {
        match vector.get(0) {
            Option::Some(option) => {
                match option {
                    Option::Some(value) => value,
                    Option::None => 0,
                }
            },
            Option::None => 0,
        }
    }

    fn echo_u64_vector_last(vector: Vec<u64>) -> u64 {
        match vector.get(vector.len() - 1) {
            Option::Some(val) => val,
            Option::None => 0,
        }
    }

    fn echo_u32_vector_addition_other_type(vector: Vec<u32>, input: u32) -> u32 {
        vector.get(0).unwrap() + input
    }

    fn echo_u32_vector_addition(vector_1: Vec<u32>, vector_2: Vec<u32>) -> u32 {
        vector_1.get(0).unwrap() + vector_2.get(0).unwrap()
    }

    fn echo_struct_vector_first(vector: Vec<BigStruct>) -> BigStruct {
        vector.get(0).unwrap()
    }

    fn echo_struct_vector_last(vector: Vec<ComplexStruct>) -> ComplexStruct {
        vector.get(vector.len() - 1).unwrap()
    }

    fn get_u64_vector() -> raw_slice {
        // Convert to a vector
        let mut vec: Vec<u64> = Vec::new();

        vec.push(1);
        vec.push(2);
        vec.push(3);

        // Return it
        vec.as_raw_slice()
    }

    fn echo_u8_vector(input: Vec<u8>) -> raw_slice {
        input.as_raw_slice()
    }

    fn echo_u64_vector(input: Vec<u64>) -> raw_slice {
        input.as_raw_slice()
    }

    fn color_enum(color: ColorEnum) -> ColorEnum {
        match color {
            ColorEnum::Red => ColorEnum::Green,
            ColorEnum::Green => ColorEnum::Blue,
            ColorEnum::Blue => ColorEnum::Red,
        }
    }

    fn vec_as_only_param(input: Vec<u64>) -> (u64, Option<u64>, Option<u64>, Option<u64>) {
        (
            input.len(),
            input.get(0),
            input.get(1),
            input.get(2),
        )
    }

    fn u32_and_vec_params(foo: u32, input: Vec<u64>) -> (u64, Option<u64>, Option<u64>, Option<u64>) {
        (
            input.len(),
            input.get(0),
            input.get(1),
            input.get(2),
        )
    }

    fn vec_in_vec(arg: Vec<Vec<u32>>) {
        let mut expected = Vec::new();
        expected.push(vec_from([0, 1, 2]));
        expected.push(vec_from([0, 1, 2]));

        assert(expected == arg);
    }

    fn vec_in_array(arg: [Vec<u32>; 2]) {
        let expected = [vec_from([0, 1, 2]), vec_from([0, 1, 2])];

        assert(expected == arg);
    }
}
