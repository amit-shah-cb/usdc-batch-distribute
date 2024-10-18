'use client'

import { useAccount, useSwitchChain, WagmiProvider } from 'wagmi'

import { config } from './libs/config'
import { base } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { WalletOptions } from './wallet-options'
import { Account } from './account'

const queryClient = new QueryClient()

function ConnectWallet() {
  const { isConnected, chain } = useAccount()

  const { switchChain } = useSwitchChain()
  console.log('chainId:', chain)
  if (isConnected && chain?.id !== base.id)
    return (
      <button
        className="className='text-white bg-blue-800 hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-full text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
        onClick={() => {
          switchChain({ chainId: base.id })
        }}
      >
        Switch to {base.name}
      </button>
    )

  if (isConnected) return <Account />
  return <WalletOptions />
}

export default function Home() {
  return (
    <div className='grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]'>
      <main className='flex flex-col gap-8 row-start-2 items-center sm:items-start'>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <ConnectWallet />
          </QueryClientProvider>
        </WagmiProvider>
      </main>
      <footer className='row-start-3 flex gap-6 flex-wrap items-center justify-center'></footer>
    </div>
  )
}
