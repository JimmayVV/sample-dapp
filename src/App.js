import React, { Component } from 'react'
// import Web3 from 'web3' // Note, downgraded to web3 0.20.6 due to cors issue - see https://github.com/ethereum/web3.js/issues/1802
import { devAbi, devAddr, ethAbi, ethAddr } from './data/Vault.abi'

import './App.css'

// const API_TOKEN = 'CF6972FQAGZ53HK5ICNM6NVJVQMTR3JZ7B'

// Kovan network ID is 42, which is what the proper smart contract is on
// Our test blockchain is id 5777, which is what we will check for in development.
const validIds = ["5777"] // const validIds = ["42", "5777"];

class App extends Component {
  state = {
    isConnected: false,
    correctNetwork: false,
    currentAccount: null,
    vaultBalance: null,
    walletBalance: null,
    networkId: null,  // Not needed in final version, just keeping track of it for dev purposes - the validIds const will take care of validation
  }

  validateInterval = null  // We will keep polling web3 to validate that the connection is still active and open

  web3 = undefined  // The local interface to the web3 object provided by MetaMask

  contract = undefined  // We will house our actual JS interface to the smart contract here

  convertWeiToEth(value) {
    if (!value || !this.web3) return

    return this.web3.fromWei(value, "ether")
  }

  componentDidMount = () => {
    // When the component mounts, verify MetaMask is configured correctly (it is assumed to be running)
    if (window.web3 !== undefined) {
      // this.web3 = new Web3(window.web3.currentProvider)
      this.web3 = window.web3;
    }

    // Validate that web3 has been set properly, and then validate that the network is configured correctly
    if (this.web3 && this.web3.isConnected()) {
      this.setState({ isConnected: true })
      this.web3.version.getNetwork(this.validateNetwork)

      // Unfortunately, per MetaMask's api documentation, they currently recommend that we set an interval to poll
      // web3 to make sure important data is still the same
      this.validateInterval = setInterval(() => {
        this.web3.version.getNetwork(this.validateNetwork)
      }, 100)
    }
  }

  validateNetwork = (err, val) => {
    if (err) {
      throw(err)
    } else {
      // First validation is to make sure that the address id is correct (see declaration above for the logic)
      const valid = validIds.includes(val)

      const newState = {
        correctNetwork: valid,
        networkId: val,
        currentAccount: this.web3.eth.accounts[0]
      }

      // Now if the network id is valid, parse the contract through Web3 so we can utilize it with vanilla JS
      if (valid) {
        const abi = (val === "42") ? ethAbi : devAbi
        const addr = (val === "42") ? ethAddr : devAddr
        // The contract abi is needed first
        const contract = this.web3.eth.contract(abi)
        // Now we need to set the address
        const contractInstance = contract.at(addr)

        // Get the current blaances of the wallet and vault
        this.getVaultBalance()
        this.getWalletBalance()

        // And finally, set the contract to this component so that we can use it
        this.contract = contractInstance
      } else {
        this.contract = null  // In case this was previously set, we need to unset it

        // Add new state variables to reset the vault and wallet balance (in addition the state set above)
        newState.vaultBalance = null
        newState.walletBalance = null
      }

      this.setState(newState)
    }
  }

  getVaultBalance = () => {
    if (!this.web3 || !this.contract) return

    const contract = this.contract;
    const { currentAccount } = this.state

    contract.balanceOf(currentAccount, (err, balance) => {
      if (!err) {
        // console.log(`This user's vault has { ${balance.toNumber()} } in it`)
        this.setState({ vaultBalance: balance.toNumber() })
      }
    })

    /*
    const transactionObject = {
      from: currentAccount,
    }

    contract.balanceOf(currentAccount, transactionObject, (err, result) => {
      console.log(`This user's vault has { ${result.toNumber()} } in it`)
    })
    */
  }

  getWalletBalance = () => {
    if (!this.web3 || !this.contract) return

    const { currentAccount } = this.state

    this.web3.eth.getBalance(currentAccount, (err, balance) => {
      if (err) console.err(err)

      // console.log(this.web3.fromWei(balance, "ether") + ' ETH')

      this.setState({ walletBalance: balance.toNumber() })
    })
  }

  depositMoney = (amount) => {
    if (!this.web3 || !this.contract || !amount) return

    const { currentAccount } = this.state

    const transactionObject = {
      sender: currentAccount,
      value: amount
    }

    console.log('Amount', amount)

    this.contract.deposit(transactionObject, (err, result) => {
      if (!err) console.log(result)
    })
  }

  render() {
    if (this.web3 === undefined) return <div>Loading...</div>

    return (
      <div>
        <h2>Is Connected? {this.state.isConnected ? 'true' : 'false'}</h2>
        <h3>Network: { this.state.networkId ? this.state.networkId : 'Null'}</h3>
        <h3>Valid?: { this.state.correctNetwork ? 'true' : 'false'}</h3>
        <p>Default account: {this.web3.eth.defaultAccount}</p>
        <p>Current account: {this.state.currentAccount}</p>
        {this.state.correctNetwork && 
          <div>
            <p><button onClick={this.getVaultBalance}>Get Vault Balance</button></p>
            <p><button onClick={this.getWalletBalance}>Get Wallet Balance</button></p>

            <p>
              <button onClick={() => this.depositMoney(1000)}>Deposit Money</button>
              - Amount: <input type="number" name="depositAmt" /> ETH - Available Balance: {this.convertWeiToEth(this.state.walletBalance)} ETH
            </p>
            <p>
              <button onClick={() => {}}>Withdraw Money</button> -
              Withdraw: <input type="number" name="withdrawAmt" /> - Available Vault Balance: {this.convertWeiToEth(this.state.vaultBalance)} ETH
            </p>

            <p><button onClick={() => {}}>Show All Recent Transactions</button></p>
          </div>
        }
      </div>
    );
  }
}

export default App
