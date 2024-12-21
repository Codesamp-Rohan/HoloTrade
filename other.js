import { marketStore } from "./app";

export function generateUID(){
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export async function checkAdmin(name, topic){
    const marketDetailString = await marketStore.get(topic);
    const marketDetail = JSON.parse(marketDetailString);
    console.log("CheckAdmin details:", marketDetail);
    return marketDetail.createdBy === name;
}