import { ethers } from 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js'

self.addEventListener('install', (event) => {
  console.log(ethers.version)
})
