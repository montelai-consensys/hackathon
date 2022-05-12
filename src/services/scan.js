import {getTransaction, getDataFromLogs, extractAddFromTCWithDrawLog, MAX_COUNT} from '../etherScan'
import {get,  write} from "../s3";
import s3Config from "../config/s3";
import appConfig from "../config/app";
import { LEVELS } from "../constants/levels"
export const scan = async(contractAddress) => {
    const {from} = await getTransaction(contractAddress);
    if (from)
    {
        const {nonce} = await getTransaction(from, 'desc');
        const list = await get(s3Config.key)
        if(list[from])
        {
           list[from]['nonce'] = nonce
        }
        else{
            list[from] = {
                nonce: nonce,
                fundedByTC: false,
            }
        }
        await write(list, s3Config.key)
        return [from, list[from]]
    }
    return [null, null]
}

export const computeRiskLevel = (data) =>{
    if(data.fundedByTC)
    {
        if(data.nonce && parseInt(data.nonce) > appConfig.nonceLevel)
        {
            return LEVELS.YELLOW
        }
        else
        {
            return LEVELS.RED
        }
    }
    return LEVELS.GREEN
    
}

export const importInitData = async(address, topic) => {
    let list = await get(s3Config.key) || {}
    if (appConfig.initScan === '1')
    {
        list = await importDataFromLogsRecursivly(address, topic, 1, list)
        console.log(`Updated record for ${address} is ${Object.keys(list).length}`)
    }
}

export const importDataFromLogsRecursivly = async(address, topic, nextPage, list) => {
    let data = await getDataFromLogs(address, topic, nextPage)
    if(data.length > 0)
    {
        list = buildData(data, list, address)
        await write(list, s3Config.key)
        if(data.length == MAX_COUNT)
        {
            const nextPage =  parseInt(data[data.length-1]['blockNumber'], 16) + 1;
            console.log(`Next page for ${address} scanning is ${nextPage}`)
            list = await importDataFromLogsRecursivly(address, topic, nextPage, list)
        }
    }
    return list
}

const buildData = (data, list, address) => {
    data.forEach((c) => {
        const addr = extractAddFromTCWithDrawLog(c.data)
        if (list[addr] === undefined)
        {
            list[addr] = {}
        }
        if (list[addr][address] === undefined)
        {
            list[addr][address] = {}
        }
        list[addr][address]['block'] = parseInt(c.blockNumber, 16);
        list[addr][address]['txHash'] = c.transactionHash;
        list[addr]['fundedByTC'] = true
    })
    return list
}

