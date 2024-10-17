'use client'

import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { FormEvent } from 'react'
import { simulateContract, writeContract } from '@wagmi/core'
import { config } from './libs/config'
import { abi } from './abi'
import { MULTICALL, USDC_ADDRESS } from './constants'
import * as ethers from 'ethers'
import { Address } from 'viem'
import { encodeFunctionData } from 'viem'
import { abi as multicallAbi } from './multicall.abi'

// function HelperDetails({ parent, helper }: { parent: Address; helper: ethers.Wallet }) {
//   const [balance, setBalance] = useState<string | null>(null)
//   const [isApproved, setIsApproved] = useState<string | null>(null)

//   const approve = () => {
//     writeContract(config, {
//       abi,
//       address: USDC_ADDRESS,
//       functionName: 'approve',
//       args: [helper.address as Address, ethers.MaxUint256],
//       account: parent,
//     }).then((tx) => {
//       console.log('tx:', tx)
//       setIsApproved(`MaxUINT Approved tx: https://basescan.org/tx/${tx}`)
//     })
//   }

//   useEffect(() => {
//     if (helper && helper.address) {
//       console.log('helper.provider:')
//       helper.provider?.getBalance(helper.address).then((balance) => {
//         console.log('balance:', balance)
//         setBalance(balance.toString())
//       })
//     }
//   }, [helper])
//   return (
//     <div>
//       <div>Helper Address: {helper.address}</div>
//       <div>EthBalance: {balance}</div>
//       <div>{isApproved ? isApproved : <button onClick={() => approve()}>Approve</button>}</div>
//     </div>
//   )
// }

export function Account() {
  const { address } = useAccount()
  const result = useBalance({
    address: address,
    token: USDC_ADDRESS,
  })
  const { disconnect } = useDisconnect()
  //   const [helper, setHelper] = useState<ethers.Wallet | null>(null)

  const approveMulticall = (value: bigint = ethers.MaxUint256) => {
    writeContract(config, {
      abi,
      address: USDC_ADDRESS,
      functionName: 'approve',
      args: [MULTICALL, value],
      account: address!,
    }).then((tx) => {
      console.log('tx:', tx)
      //   setIsApproved(`MaxUINT Approved tx: https://basescan.org/tx/${tx}`)
    })
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const accounts = formData.get('addresses')?.valueOf().toString().split('\n') ?? []
    console.log(accounts)
    const args = accounts.map((acctVal) => {
      const [to, val] = acctVal.split(',')
      return {
        target: USDC_ADDRESS as Address,
        allowFailure: false,
        callData: encodeFunctionData({
          abi,
          args: [address as Address, to as Address, BigInt(val)],
          functionName: 'transferFrom',
        }),
      }
    })

    simulateContract(config, {
      abi: multicallAbi,
      address: MULTICALL as `0x${string}`,
      functionName: 'aggregate',
      args: [args],
      account: address!,
    })
      .then((result) => {
        console.log('simulation result:', result)
        writeContract(config, {
          abi: multicallAbi,
          address: MULTICALL as `0x${string}`,
          functionName: 'aggregate',
          args: [args],
          account: address!,
        }).then((tx) => {
          console.log('tx:', tx)
        })
      })
      .catch((err) => {
        console.error(err)
      })
  }

  //   async function loadHelper() {
  //     signMessage(config, { message: 'Loading helper for this domain' }).then((sig) => {
  //       const key = ethers.keccak256(sig)

  //       const w = new ethers.Wallet(key).connect(
  //         new ethers.JsonRpcProvider(`https://base.gateway.tenderly.co/1Oz4gU8uN7RckK40jhysCE`),
  //       )
  //       console.log(w.address)
  //       setHelper(w)
  //     })
  //   }

  return (
    <div>
      {/* 
      <div>
        {helper ? <HelperDetails helper={helper} /> : <button onClick={() => loadHelper()}>Load Helper</button>}
      </div> */}

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
            <h2 className='text-base font-semibold leading-7 text-gray-900'>Wallet Address</h2>
            <p className='mt-1 text-sm leading-6 text-gray-600'>{address ? address : `Loading Wallet ...`}</p>
            <h2 className='text-base font-semibold leading-7 text-gray-900'>{result.data?.symbol} Balance</h2>
            <p className='mt-1 text-sm leading-6 text-gray-600'>{result.data?.value.toLocaleString()}</p>
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
                  colon : seperated list of address,value e.g. {address},100:...{' '}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='mt-6 flex items-center justify-end gap-x-6'>
          <button
            type='button'
            onClick={() => {
              approveMulticall()
            }}
            className='text-sm font-semibold leading-6 text-gray-900'
          >
            Approve Multicall
          </button>
          <button
            type='button'
            onClick={() => {
              approveMulticall(BigInt(0))
            }}
            className='text-sm font-semibold leading-6 text-gray-900'
          >
            Revoke Multicall
          </button>
          <button
            type='submit'
            className='rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          >
            Send Transaction
          </button>
        </div>
      </form>
    </div>
  )
}
