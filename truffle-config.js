var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      host: "127.0.0.1",
      port: 8545,
      network_id: '*',
      accounts: 50,
      defaultEtherBalance: 500,
      gas: 10000000
    }
  },
  compilers: {
    solc: {
      version: "^0.5.17"
    }
  }
};