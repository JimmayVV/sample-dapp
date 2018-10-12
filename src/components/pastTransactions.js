import React, { Component } from 'react'
import { Table, TableBody, TableHead  } from 'mdbreact';
import _ from 'lodash'

class PastTransactions extends Component {
  state = {
    events: [],
    lowestBlock: 0
  }

  interval = null // We want to regularly retrieve the most recent events, and the interval will be set here

  componentDidMount = () => {
    this.retrieveEvents()
    this.interval = setInterval(this.retrieveEvents, 5000)
    // Sort array
  }

  retrieveEvents = () => {
    this.getDeposits()
    this.getWithdrawals()
  }

  getDeposits = () => {
    this.props.contract.Deposit({}, { fromBlock: this.state.lowestBlock, toBlock: 'latest' }).get((err, results) => {
      if (err)
        this.props.flashError('There was an error getting deposits. Please verify MetaMask is connected to the right network')
      else {
        // Process the retrieved deposits
        this.processEvents(results)
      }
    })
  }

  getWithdrawals = () => {
    this.props.contract.Withdraw({}, { fromBlock: this.state.lowestBlock, toBlock: 'latest' }).get((err, results) => {
      if (err)
        this.props.flashError('There was an error getting deposits. Please verify MetaMask is connected to the right network')
      else {
        // Process the retrieved withdrawals
        this.processEvents(results)
      }
    })
  }

  processEvents = (events) => {
    if (!Array.isArray(events) || events.length === 0) return // Verify that the results are a valid array, and have contents

    // Don't process these events if there are only 1, and if it's already in the array
    if (events.length === 1 && (/*events.blockNumber === this.state.lowestBlock || */_.findIndex(this.state.events, elem => { return elem.blockNumber === events[0].blockNumber }) >= 0)) return

    this.setState(state => {
      let highestBlock = state.lowestBlock

      events.forEach(value => {
        if (value.blockNumber > highestBlock) highestBlock = value.blockNumber
      })

      // Extra check to make sure there are no dupes
      const newEvents = _.uniqWith([...state.events, ...events], _.isEqual)

      newEvents.sort((a, b) => {
        // Reverse sort the array, so the most recent event is in elem 0
        return b.blockNumber - a.blockNumber
      })

      return {
        lowestBlock: highestBlock,
        events: newEvents
      }
    })
  }

  render() {
    const events = this.state.events.slice(0, 10)

    return (
      <Table responsive>
        <TableHead>
          <tr>
            <th>Block #</th>
            <th>Event Type</th>
            <th>User</th>
            <th>Amount</th>
          </tr>
        </TableHead>
        <TableBody>
          {
            events.map(event => (
              <tr key={`Events${event.blockNumber}`}>
                <td>{event.blockNumber}</td>
                <td>{event.event}</td>
                <td>{event.args.user}</td>
                <td>{this.props.renderValue(event.args.amount)}</td>
              </tr>
            ))
          }
        </TableBody>
      </Table>
    )
  }
}

export default PastTransactions
