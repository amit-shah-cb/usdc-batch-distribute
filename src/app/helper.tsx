// import { ethers } from 'ethers'
// import { FormEvent, useEffect, useState } from 'react'
// import { Address, encodeFunctionData, parseEther } from 'viem'
// import { sendTransaction, signMessage, simulateContract, writeContract } from 'wagmi/actions'
// import { config } from './libs/config'
// import { abi } from './abi'
// import { MULTICALL, USDC_ADDRESS } from './constants'
// import { FallbackProvider, JsonRpcProvider } from 'ethers'
// import { useMemo } from 'react'
// import type { Chain, Client, Transport } from 'viem'
// import { type Config, useClient } from 'wagmi'
// import { Output } from './output'
// import { abi as multicallAbi } from './multicall.abi'
// import { chunk } from 'lodash'
// import { ContractTransactionResponse } from 'ethers'

// export function clientToProvider(client: Client<Transport, Chain>) {
//   const { chain, transport } = client
//   const network = {
//     chainId: chain.id,
//     name: chain.name,
//     ensAddress: chain.contracts?.ensRegistry?.address,
//   }
//   if (transport.type === 'fallback') {
//     const providers = (transport.transports as ReturnType<Transport>[]).map(
//       ({ value }) => new JsonRpcProvider(value?.url, network),
//     )
//     if (providers.length === 1) return providers[0]
//     return new FallbackProvider(providers)
//   }
//   console.log('using provider:', transport.url)
//   return new JsonRpcProvider(transport.url, network)
// }

// /** Action to convert a viem Client to an ethers.js Provider. */
// export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
//   const client = useClient<Config>({ chainId })
//   return useMemo(() => (client ? clientToProvider(client) : undefined), [client])
// }

// export function Helper({ parent }: { parent: Address }) {
//   const provider = useEthersProvider()
//   const [balance, setBalance] = useState<string | null>(null)
//   const [isApproved, setIsApproved] = useState<string | null>(null)
//   const [helper, setHelper] = useState<ethers.Wallet | null>(null)
//   const [history, setHistory] = useState<string[]>([])
//   const [output, setOutput] = useState<string>('')
//   async function initiate() {
//     signMessage(config, { message: 'Loading helper for this domain', account: parent }).then((sig) => {
//       const key = ethers.keccak256(sig)

//       const w = new ethers.Wallet(key).connect(new ethers.JsonRpcProvider())
//       console.log(w.address)
//       setHelper(w)
//       setOutput('initiated background worker')
//     })
//   }

//   //   useEffect(() => {
//   //     if ('serviceWorker' in navigator) {
//   //       navigator.serviceWorker
//   //         .register('/service-worker.js', { scope: '/' })
//   //         .then((registration) => {
//   //           console.log('Service worker registered successfully. Scope:', registration.scope)
//   //         })
//   //         .catch((error) => {
//   //           console.error('Service worker registration failed:', error)
//   //         })
//   //     }
//   //   }, [])

//   const fund = (value: string) => {
//     sendTransaction(config, { to: helper?.address as `0x${string}`, value: parseEther(value) }).then((tx) => {
//       console.log('tx:', tx)
//       setOutput(`helper funded: https://basescan.org/tx/${tx}`)
//     })
//   }
//   const approve = (value: bigint = ethers.MaxInt256) => {
//     const wallet = helper?.connect(provider!)
//     const usdcContract = new ethers.Contract(USDC_ADDRESS, abi, wallet)
    
//     writeContract(config, {
//       abi,
//       address: USDC_ADDRESS,
//       functionName: 'approve',
//       args: [helper?.address as Address, value],
//       account: parent,
//     }).then((tx) => {
//       console.log('tx:', tx)
//       setOutput((value !== BigInt(0) ? `Approved:` : `Revoked:`) + `tx: https://basescan.org/tx/${tx}`)
//       console.log('approving multicall for helper')
//       usdcContract
//         .approve(MULTICALL, value)
//         .then((tx: ContractTransactionResponse) => {
//           console.log('tx:', tx)
//           setOutput((value !== BigInt(0) ? `Approved:` : `Revoked:`) + `tx: https://basescan.org/tx/${tx.hash}`)
//         })
//         .catch((error) => {
//           console.error('error:', error)
//           setOutput(`error: ${error}`)
//         })
//     })
//   }

//   async function onSubmit(event: FormEvent<HTMLFormElement>) {
//     event.preventDefault()
//     const wallet = helper?.connect(provider!)
//     const multicallContract = new ethers.Contract(MULTICALL, multicallAbi, wallet)
//     const formData = new FormData(event.currentTarget)
//     const accounts = formData.get('addresses')?.valueOf().toString().split('\n') ?? []
//     console.log(accounts)
//     const args = accounts.map((acctVal) => {
//       const [to, val] = acctVal.split(',')
      

//       return {
//         target: USDC_ADDRESS as Address,
//         allowFailure: false,
//         callData: encodeFunctionData({
//           abi,
//           args: [parent as Address, to as Address, BigInt(val)],
//           functionName: 'transferWithAuthorization',
//         }),
//       }
//     })
//     const chunks = chunk(accounts, 10)
//     for (var i = 0; i < chunks.length; i++) {
//       const c = chunks[i]
//       console.log(await multicallContract.aggregate.estimateGas(c))
//     }
//   }

//   useEffect(() => {
//     if (helper && helper.address) {
//       console.log('helper.provider:')
//       provider?.getBalance(helper.address).then((balance) => {
//         console.log('balance:', balance)
//         setBalance(balance.toString())
//       })
//     }
//   }, [helper])

//   return (
//     <div>
//       <form onSubmit={onSubmit}>
//         <div className='space-y-12'>
//           <div className='border-b border-gray-900/10 pb-12'>
//             <h2 className='text-base font-semibold leading-7 text-gray-900'>Helper Address</h2>
//             <p className='mt-1 text-sm leading-6 text-gray-600'>{helper?.address}</p>
//             <h2 className='text-base font-semibold leading-7 text-gray-900'>Eth Balance</h2>
//             <p className='mt-1 text-sm leading-6 text-gray-600'>{balance}</p>
//             <div className='mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6'>
//               <div className='col-span-full'>
//                 <label htmlFor='about' className='block text-sm font-medium leading-6 text-gray-900'>
//                   Addresses
//                 </label>
//                 <div className='mt-2'>
//                   <textarea
//                     id='addresses'
//                     name='addresses'
//                     rows={3}
//                     className='block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6'
//                     defaultValue={''}
//                   />
//                 </div>
//                 <p className='mt-3 text-sm leading-6 text-gray-600'>
//                   newline seperated list of address,value e.g. {helper?.address},100
//                 </p>
//               </div>
//             </div>
//             <Output output={output} />
//             <div className='mt-6 flex items-center justify-end gap-x-6'>
//               <button
//                 type='button'
//                 onClick={() => {
//                   initiate()
//                 }}
//                 className='rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
//               >
//                 Initiate Worker
//               </button>
//               <button
//                 type='button'
//                 onClick={() => {
//                   fund('0.0001')
//                 }}
//                 className='rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
//               >
//                 Fund Worker 0.0001 ETH
//               </button>
//               <button
//                 type='button'
//                 onClick={() => {
//                   approve()
//                 }}
//                 className='rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
//               >
//                 Approve Worker
//               </button>
//               <button
//                 type='button'
//                 onClick={() => {
//                   approve(BigInt(0))
//                 }}
//                 className='rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
//               >
//                 Revoke Worker
//               </button>
//               <button
//                 type='submit'
//                 className='rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
//               >
//                 Batch Transaction
//               </button>
//             </div>
//           </div>
//         </div>
//       </form>
//     </div>
//   )
// }
