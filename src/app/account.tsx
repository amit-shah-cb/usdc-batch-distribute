'use client'

import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { FormEvent, useCallback, useState } from 'react'
import { simulateContract, writeContract } from '@wagmi/core'
import { config } from './libs/config'
import { abi } from './abi'
import { MULTICALL, USDC_ADDRESS } from './constants'
import * as ethers from 'ethers'
import { Address, formatUnits, parseUnits } from 'viem'
import { encodeFunctionData } from 'viem'
import { abi as multicallAbi } from './multicall.abi'
import { signMessage, signTypedData } from 'wagmi/actions'
import { Output } from './output'
import { base } from 'viem/chains'

const transferWithAuthorizationTypedData = {
  "types": {
    "TransferWithAuthorization": [
      { "name": "from", "type": "address" },
      { "name": "to", "type": "address" },
      { "name": "value", "type": "uint256" },
      { "name": "validAfter", "type": "uint256" },
      { "name": "validBefore", "type": "uint256" },
      { "name": "nonce", "type": "bytes32" }
    ]
  },
  "domain": {
    "name": "USD Coin",
    "version": "2",
    "chainId": base.id,
    "verifyingContract": USDC_ADDRESS as `0x${string}`
  },
  "primaryType": "TransferWithAuthorization"
};

export function Account() {
  const { address } = useAccount()
  const result = useBalance({
    address: address,
    token: USDC_ADDRESS,
  })
  const { disconnect } = useDisconnect()
  const [output, setOutput] = useState<string>('')
  const [helper, setHelper] = useState<ethers.Wallet | null>(null)
  

  const ownerTransferWithAuthorizationTypedData = useCallback(async (value: bigint, nonce: `0x${string}`) => {
    if (!address || !helper) {
      return
    }
    const validAfter = Math.floor(Date.now() / 1000)
    const message = {
      from: address as Address,
      to: helper.address as Address,
      value: value,
      validBefore: BigInt(validAfter + 20),//20 seconds
      validAfter: BigInt(0),
      nonce: nonce as `0x${string}`,
    }    
    const sig = await signTypedData(config, {

      domain: transferWithAuthorizationTypedData.domain,
      types: transferWithAuthorizationTypedData.types,
      message: message ,
      primaryType: transferWithAuthorizationTypedData.primaryType as `TransferWithAuthorization`
    })
    const recoveredAddress = await ethers.verifyTypedData(transferWithAuthorizationTypedData.domain,
      transferWithAuthorizationTypedData.types,
      message,
      sig as `0x${string}`
    )
    if (recoveredAddress !== address) {
      throw new Error("signature verification failed")
    }

    return encodeFunctionData({
      abi,
      args: [message.from, message.to, message.value, message.validAfter, message.validBefore, message.nonce, sig as `0x${string}`],
      functionName: 'transferWithAuthorization',
    })
  }, [address, helper])

  const generateTransferWithAuthorizationTypedDataAndSignature = useCallback(async (helper: ethers.Wallet, to: Address, value: bigint, nonce: `0x${string}`) => {
    if (!helper) {
      return
    }
    const validAfter = Math.floor(Date.now() / 1000)
    const message = {
      from: helper.address as Address,
      to: to as Address,
      value: value,
      validBefore: BigInt(validAfter + (60 * 5)),
      validAfter: BigInt(0),
      nonce: nonce as `0x${string}`,
    }
    console.log(message)
    const sig = await helper?.signTypedData(transferWithAuthorizationTypedData.domain,
      transferWithAuthorizationTypedData.types,
      message
    )
    const recoveredAddress = await ethers.verifyTypedData(transferWithAuthorizationTypedData.domain,
      transferWithAuthorizationTypedData.types,
      message,
      sig as `0x${string}`
    )
    if (recoveredAddress !== helper.address) {
      throw new Error("helper signature verification failed")
    }
    return encodeFunctionData({
      abi,
      args: [message.from, message.to, message.value, message.validAfter, message.validBefore, message.nonce, sig as `0x${string}`],
      functionName: 'transferWithAuthorization',
    })
  },[])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!helper) {
      return
    }
    event.preventDefault()


    const formData = new FormData(event.currentTarget)
    const accounts = formData.get('addresses')?.valueOf().toString().split('\n') ?? []
    let args: {target: Address, allowFailure: boolean, callData: `0x${string}`}[] = []
    let totalVal = BigInt(0)
    for (const acctVal of accounts) {
      const [to, uval] = acctVal.split(',')
      const val = parseUnits(uval, result.data?.decimals as number)
      const nonce = ethers.hexlify(ethers.randomBytes(32)) as `0x${string}`
      const data = await generateTransferWithAuthorizationTypedDataAndSignature(helper, to as `0x${string}`, BigInt(val), nonce)

      args.push({
        target: USDC_ADDRESS as Address,
        allowFailure: false,
        callData: data as `0x${string}`,
      })
      totalVal += BigInt(val)
    }
    const ownerTransferCallData = await ownerTransferWithAuthorizationTypedData(
      totalVal,
      ethers.hexlify(ethers.randomBytes(32)) as `0x${string}`)
    args = [
      {
        target: USDC_ADDRESS as Address,
        allowFailure: false,
        callData: ownerTransferCallData as `0x${string}`,
      }
      ,
      ...args]

    const multicallData = encodeFunctionData({
      abi: multicallAbi,
      args: [args],
      functionName: 'aggregate',
    })
    console.log(multicallData)

    simulateContract(config, {
      abi: multicallAbi,
      address: MULTICALL as `0x${string}`,
      functionName: 'aggregate',
      args: [args],
      account: helper.address as `0x${string}`,
    })
      .then((simulationResult) => {
        console.log('simulation result:', simulationResult)
        setOutput(`simulation success, proceeding to submit tx with helper`)
        writeContract(config, {
          abi: multicallAbi,
          address: MULTICALL as `0x${string}`,
          functionName: 'aggregate',
          args: [args],
          account: address as `0x${string}`,
          value: BigInt(0),
        }).then((tx) => {
          console.log('tx:', tx)
          setOutput(`distributed to ${accounts.length} accounts ${ethers.formatUnits(totalVal, result.data?.decimals as number)} USDC: https://basescan.org/tx/${tx}`)
        })
      })
      .catch((err) => {
        console.error(err)
        setOutput(`error running simulation`)
      })
  }

  async function initiate() {
    signMessage(config, { message: `!!!WARNING: CONFIRM THE DOMAIN IS ${process.env.NEXT_PUBLIC_BASE_URL}!!! Loading ephemereal helper wallet with random salt:0x0e42b21176935c84185d60e61413264a1cf24f2dc487aded7cb6782b3d87153a`, account: address }).then((sig: `0x${string}`) => {
      const key = ethers.keccak256(ethers.keccak256(sig))
      const w = new ethers.Wallet(key).connect(new ethers.JsonRpcProvider())
      console.log(w.address)
      setHelper(w)
      setOutput(`initiated background worker: ${w.address}`)
    })
  }

  if (!helper) {
    return (
      <button
        className="className='text-white bg-blue-800 hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-full text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
        onClick={() => {
          initiate()
        }}
      >
        initiate helper
      </button>)
  }

  return (
    <div>
      <div className='mt-6 flex items-center justify-end gap-x-6'>
        <button
          type='button'
          onClick={() => {
            disconnect()
          }}
          className='rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
        >
          Disconnect
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <div className='space-y-12'>
          <div className='border-b border-gray-900/10 pb-12'>
            <h3 className='text-base font-semibold leading-7 text-gray-900'>Wallet Address</h3>
            <p className='mt-1 text-sm leading-6 text-gray-600'>{address ? address : `Loading Wallet ...`}</p>
            <h3 className='text-base font-semibold leading-7 text-gray-900'>{result.data?.symbol} Balance</h3>
            <p className='mt-1 text-sm leading-6 text-gray-600'>{result.data ? formatUnits(result.data?.value as bigint, result.data?.decimals as number) : `Loading Balance ...`}</p>
            <h3 className='text-base font-semibold leading-7 text-gray-900'> Helper Wallet</h3>
            <p className='mt-1 text-sm leading-6 text-gray-600'>{helper ? helper.address : `Loading Helper Wallet ...`}</p>
            <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
              <div className='col-span-full'>
                <label htmlFor='about' className='block text-sm font-medium leading-6 text-gray-900'>
                  Addresses
                </label>
                <div className='mt-2'>
                  <textarea
                    id='addresses'
                    name='addresses'
                    rows={3}
                    className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6'
                    defaultValue={''}
                  />
                </div>
                <p className='mt-3 text-sm leading-6 text-gray-600'>
                  newline seperated list of address,$value e.g.{address},{formatUnits(BigInt(100000), 6)}
                </p>
              </div>
            </div>
            <Output output={output} />
            <div className='mt-6 flex items-center justify-end gap-x-6'>
              <button
                type='submit'
                className='rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
              >
                Send Transaction
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
