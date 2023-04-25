contract;

abi Counter {
    #[storage(read)]
    fn get_count() -> u64;

    #[storage(write, read)]
    fn increment_count(amount: u64) -> u64;
}

storage {
    count: u64 = 0,
}

impl Counter for Contract {
    #[storage(read)]
    fn get_count() -> u64 {
        storage.count
    }

    #[storage(write, read)]
    fn increment_count(amount: u64) -> u64 {
        storage.count += amount;
        storage.count
    }
}
