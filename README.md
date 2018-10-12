# Ethereum dapp coding challenge

We have deployed a smart contract to the Ethereum testnet (Kovan): [https://kovan.etherscan.io/address/0x3430d3fc79e35f33bb69c4a0b4b89bc9ee107897](https://kovan.etherscan.io/address/0x3430d3fc79e35f33bb69c4a0b4b89bc9ee107897). The smart contract is a simple one called Vault that has two non-constant functions:

- **deposit()** -- a payable function that accepts Ether and adds it to the sender’s balance.
- **withdraw(uint amount)** -- a function that removes Ether from the sender’s balance and sends it back to him.

And one constant function:

- **balanceOf(address user)** -- a function that returns the balance of the given address.

The code is verified for you to look at on Etherscan (go to the link above and click the “Code” tab).
Your mission, should you choose to accept it, is to create a dapp interface that allows the user to interact with this smart contract.
Requirements:

- Allow the user to deposit.
- Allow the user to withdraw.
- Show the user’s current Ether balance in his wallet.
- Show the user’s current Ether balance in the Vault.
- Show recent deposit and withdraw events from all users.
- Assume the user has MetaMask.
- Use a Web framework of your preference.
- Deploy the dapp to GitHub pages.

Resources:

- **[Web3.js](https://github.com/ethereum/web3.js/)**
- **[Etherscan API](https://kovan.etherscan.io/apis)**
- **[MetaMask](https://metamask.io/)**
