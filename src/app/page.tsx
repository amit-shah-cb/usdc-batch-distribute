'use client'

import { useAccount, WagmiProvider } from 'wagmi'
import { config } from './libs/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { WalletOptions } from './wallet-options'
import { Account } from './account'

const queryClient = new QueryClient()

function ConnectWallet() {
  const { isConnected } = useAccount()
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
