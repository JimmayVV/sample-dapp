import React, { Component } from 'react'
import {
  Navbar, NavbarBrand, NavbarNav,
  Dropdown, DropdownToggle, DropdownMenu, DropdownItem,
  Card, CardBody,
  Input, Button
} from 'mdbreact';
// import Web3 from 'web3' // Note, downgraded to web3 0.20.6 due to cors issue - see https://github.com/ethereum/web3.js/issues/1802
import { devAbi, devAddr, ethAbi, ethAddr } from './data/Vault.abi'

import './App.css'
import PastTransactions from './components/pastTransactions'

// const API_TOKEN = 'CF6972FQAGZ53HK5ICNM6NVJVQMTR3JZ7B'

// Kovan network ID is 42, which is what the proper smart contract is on
// Our test blockchain is id 5777, which is what we will check for in development.
const validIds = ["42", "5777"] // const validIds = ["42", "5777"];

class App extends Component {
  state = {
    isConnected: false,
    correctNetwork: false,
    currentAccount: null,
    vaultBalance: null,
    walletBalance: null,
    depositInput: '',
    withdrawInput: '',
    errors: null,
    success: null,
    // lowestBlock: 0,
    // events: [],
    networkId: null,  // Not needed in final version, just keeping track of it for dev purposes - the validIds const will take care of validation
  }

  validateInterval = null  // We will keep polling web3 to validate that the connection is still active and open

  // Error and success timeouts to flash messages to the user with
  errorTimeout = null
  successTimeout = null

  web3 = undefined  // The local interface to the web3 object provided by MetaMask. We could connect to the Vault manually with our own
                    // web3 instance, however, we still would require MetaMask to connect to that network, so we might as well use the
                    // free web3 instance MetaMask gives us, and validate off of that

  contract = undefined  // We will house our actual JS interface to the smart contract here

  //depositRef = React.createRef()  // A ref to the deposit amount input
  //withdrawRef = React.createRef() // A ref to the withdraw amount input

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

  convertWeiToEth = (value) => {
    if (!value || !this.web3) return

    return this.web3.fromWei(value, "ether")
  }

  renderValue = (value) => {
    if (isNaN(value)) value = 0
    if (value < 100000) return value + ' WEI'
    return this.convertWeiToEth(value) + ' ETH'
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
      if (err) this.flashError('Error: ' + err)
      this.setState({ vaultBalance: balance.toNumber() })
    })
  }

  getWalletBalance = () => {
    if (!this.web3 || !this.contract) return

    const { currentAccount } = this.state

    this.web3.eth.getBalance(currentAccount, (err, balance) => {
      if (err) this.flashError('Error: ' + err)
      this.setState({ walletBalance: balance.toNumber() })
    })
  }

  depositMoney = () => {
    const amount = this.state.depositInput

    if (!this.web3 || !this.contract || !amount) {
      this.flashError('Deposit failed')
      return
    }

    const { currentAccount } = this.state

    const transactionObject = {
      sender: currentAccount,
      value: amount
    }

    this.contract.deposit(transactionObject, (err, result) => {
      if (!err) {
        this.flashSuccess(`Successfully deposited ${this.renderValue(amount)} to the vault! Confirmation: ${result}`)
        this.setState({depositInput: ''})
      }
    })
  }

  withdrawMoney = () => {
    const amount = this.state.withdrawInput

    if (!this.web3 || !this.contract || !amount) {
      this.flashError('Withdraw failed')
      return
    }

    const { currentAccount } = this.state

    const transactionObject = {
      sender: currentAccount,
    }

    this.contract.withdraw(amount, transactionObject, (err, result) => {
      if (!err) this.flashSuccess(`Successfully withdrew ${this.renderValue(amount)} from the vault! Confirmation: ${result}`)
      else this.flashError('There was an error withdrawing funds from your vault. Please verify there are sufficient funds')
      this.setState({withdrawInput: ''})
    })
  }

  flashError = (message) => {
    // If there was a previous error message, wipe out the timeout, so we can start the clock on a new error
    clearTimeout(this.errorTimeout)
    // Set the error message
    this.setState({ errors: message })
    // After 10 seconds, wipe out the error
    this.errorTimeout = setTimeout(() => {this.setState({errors: null})}, 10000)
  }

  flashSuccess = (message) => {
    // If there was a previous error message, wipe out the timeout, so we can start the clock on a new error
    clearTimeout(this.successTimeout)
    // Set the error message
    this.setState({ success: message })
    // After 10 seconds, wipe out the error
    this.successTimeout = setTimeout(() => {this.setState({success: null})}, 10000)
  }

  depositInputChange = (e) => {
    const amount = e.target.value

    const valid = e.target.validity.valid

    if (!valid) return

    this.setState({
      depositInput: amount
    })
  }

  withdrawInputChange = (e) => {
    const amount = e.target.value

    const valid = e.target.validity.valid

    if (!valid) return

    this.setState({
      withdrawInput: amount
    })
  }

  render() {
    return (
      <>
        <Navbar color="indigo" dark expand="md" className="mb-3">
          <NavbarBrand tag="span">Sample Dapp</NavbarBrand>
          <NavbarNav right>
            <Dropdown>
              <DropdownToggle nav caret>Network Status: {this.state.correctNetwork ? 'Successful!' : 'Unsuccessful'}</DropdownToggle>
              <DropdownMenu right>
                <DropdownItem header>Connected to Blockchain: {this.state.isConnected ? 'Yes' : 'No'}</DropdownItem>
                <DropdownItem header>Kovan Testnet: {this.state.correctNetwork ? 'Yes' : 'No'}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
            <Dropdown>
              <DropdownToggle nav caret>Your Account</DropdownToggle>
              <DropdownMenu right>
                <DropdownItem header>Account Number:<br />{this.state.currentAccount}</DropdownItem>
                <DropdownItem divider/>
                <DropdownItem>Vault Balance: {this.renderValue(this.state.vaultBalance)}</DropdownItem>
                <DropdownItem>Wallet Balance: {this.renderValue(this.state.walletBalance)}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarNav>
        </Navbar>

        <div className="container pb-3">
          { this.state.errors && <div className="alert alert-danger">{this.state.errors}</div> }
          { this.state.success && <div className="alert alert-success">{this.state.success}</div> }
          
          {(!this.state.correctNetwork || this.web3 === undefined) &&
            <Card>
              <CardBody>
                Please check your configuration to ensure that MetaMask is configured properly, and is connected to the Kovan network
              </CardBody>
            </Card>
          }

          {this.state.correctNetwork &&
            <>
              <h2>Your vault</h2>
              <Card>
                <CardBody>
                  <div className="row mb-3">
                    <div className="col"><h3>Your Vault Balance: <strong>{this.renderValue(this.state.vaultBalance)}</strong></h3></div>
                    <div className="col"><h3>Your Wallet Balance: <strong>{this.renderValue(this.state.walletBalance)}</strong></h3></div>
                  </div>
                  <div className="row">

                    <div className="col">
                      <h5>Deposit to your vault:</h5>
                      <Input
                        type="tel"
                        label="Amount to deposit"
                        pattern={'[0-9]*'}
                        value={this.state.depositInput}
                        onChange={this.depositInputChange}
                      />
                      <div className="row">
                        <div className="col"><Button block color="primary" onClick={this.depositMoney}>Deposit</Button></div>
                        <div className="col"><Button block color="danger" onClick={() => this.setState({depositInput: ''})}>Clear</Button></div>
                      </div>
                    </div>

                    <div className="col">
                      <h5>Withdraw from your vault:</h5>
                      <Input
                        type="tel"
                        label="Amount to withdraw"
                        pattern={'[0-9]*'}
                        value={this.state.withdrawInput}
                        onChange={this.withdrawInputChange}
                      />
                      <div className="row">
                        <div className="col"><Button block color="warning" onClick={this.withdrawMoney}>Withdraw</Button></div>
                        <div className="col"><Button block color="danger" onClick={() => this.setState({withdrawInput: ''})}>Clear</Button></div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <h2 className="mt-3">Recent Transactions</h2>
              <Card>
                <CardBody>
                  <PastTransactions
                    contract={this.contract}
                    flashSuccess={this.flashSuccess}
                    flashError={this.flashError}
                    renderValue={this.renderValue}
                  />
                </CardBody>
              </Card>
            </>
          }
        </div>
      </>
    );
  }
}

export default App
