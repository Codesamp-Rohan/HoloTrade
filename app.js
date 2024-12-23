/** @typedef {import('pear-interface')} */ /* global Pear */

import crypto from 'hypercore-crypto';
import Autopass from 'autopass';
import Corestore from 'corestore';
import b4a from 'b4a';
import { checkAdmin, deleteProduct, generateProductList, generateUID } from './other';
import Hyperswarm from 'hyperswarm';

export const marketDir = Pear.config.storage + "./market";
export const userDir = Pear.config.storage + "./user";

let userName;
let userId;
let isAdmin;
let roomTopic;

export const userStore = new Autopass(new Corestore(userDir));
export const marketStore = new Autopass(new Corestore(marketDir));

const swarm = new Hyperswarm();

swarm.on('connection', async (connection, info) => {
    console.log('New peer connected:', info.peer);
    
    // Listen for incoming data
    connection.on('data', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('Received message:', message);

            if (message.type === 'market-data') {
                // Save received market data
                await marketStore.add(message.topic, JSON.stringify(message.marketDetails));
                console.log('Marketplace data synced:', message.topic);
            }
        } catch (err) {
            console.error('Failed to process incoming data:', err);
        }
    });

    // Send market data if admin
    if (isAdmin) {
        const marketData = await marketStore.get(roomTopic);
        const marketDetails = JSON.parse(marketData);
        connection.write(b4a.from(JSON.stringify({
            type: 'market-data',
            topic: roomTopic,
            marketDetails,
        })));
        console.log('Shared market data:', roomTopic);
    }

    connection.on('close', () => {
        console.log('Connection closed with peer:', info.peer);
    });
});

function joinSwarm(topic) {
    swarm.join(b4a.from(topic, 'hex'), { lookup: true, announce: true });
    console.log(`Joined swarm with topic: ${topic}`);
}

Pear.teardown(() => {
    userStore.close();
    marketStore.close();
    swarm.destroy();
    console.log('Cleaned up resources.');
});

Pear.updates(() => Pear.reload());


async function createMarket(userName) {
    const topicBuffer = crypto.randomBytes(32);
    const topicHex = topicBuffer.toString('hex');
    try {
        await marketStore.add(topicHex, JSON.stringify({
            topic: topicHex,
            createdBy: userName,
            createdAt: new Date().toISOString(),
        }));
        document.querySelector('.add-product-btn').classList.remove('hidden');
        console.log(`Marketplace created and stored with topic: ${topicHex}`);
        const market = await marketStore.get(topicHex);
        displayMarket(topicHex, userName, JSON.parse(market));
        joinSwarm(topicHex);
    } catch (error) {
        console.error("Error creating marketplace:", error);
    }
}

async function joinMarket(userName, topicHex) {
    try {
        const market = await marketStore.get(topicHex);
        if (!market) {
            console.error("Marketplace not found locally!");
            alert("Marketplace not found. Wait for sync or check topic.");
            return;
        }

        console.log('Marketplace data found:', JSON.parse(market));
        console.log(`Successfully joined market: ${topicHex}`);
        displayMarket(topicHex, userName, JSON.parse(market));
        joinSwarm(topicHex);
    } catch (error) {
        console.error("Error joining marketplace:", error);
    }
}

async function displayMarket(topicHex, userName, marketDetails = null) {
    document.querySelector('#menu').classList.add('hidden');
    document.querySelector("#loading").classList.remove('hidden');
    document.querySelector('#join-section').classList.add('hidden');
    if (marketDetails) {
        console.log("Market Details:", marketDetails);
    }
    console.log(`Joined as: ${userName}`);
    document.querySelector('#loading').classList.add('hidden');
    document.querySelector('#room').classList.remove('hidden');
    document.querySelector('#room-topic').innerText = topicHex;
    roomTopic = topicHex;
    document.querySelector('#room-creator').innerText = marketDetails.createdBy;
    const productListContainer = document.querySelector('.productList--area');
    productListContainer.innerHTML = '';

    isAdmin = await checkAdmin(userName, topicHex);
    if(isAdmin){
        document.querySelector('.add-product-btn').classList.remove('hidden');
    } else {
        document.querySelector('.add-product-btn').classList.add('hidden');
    }
    reloadProductList(marketDetails, isAdmin);
}


async function checkUser(name) {
    try {
        const user = await userStore.get(name);
        return !!user;
    } catch (error) {
        console.error("Error accessing user:", error);
        return false;
    }
}

document.querySelector('#userName-create-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    userName = document.querySelector('#userName-create').value.trim();
    if (await checkUser(userName)) {
        notification('Such username exists!!!', 'alert');
        return;
    }
    userId = generateUID();
    try {
        await userStore.add(userName, JSON.stringify({ useruid: userId, createdAt: new Date().toISOString() }));
        console.log("Your name is ",userName);
        document.querySelector('.name-menu').classList.add('hidden');
        document.querySelector('#menu').classList.remove('hidden');
    } catch (error) {
        console.error("Error saving username:", error);
        alert("Failed to create username. Try again.");
    }
});


document.querySelector('#userName-join-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    userName = document.querySelector('#userName-join').value.trim();
    const isUser = await checkUser(userName);
    if (isUser) {
        notification(`${userName} found`, 'success');
        try {
            const userDetail = await userStore.get(userName);
            console.log(JSON.parse(userDetail));
            document.querySelector('.name-menu').classList.add('hidden');
            document.querySelector('#menu').classList.remove('hidden');
        } catch (error) {
            notification(`${userName} not found ⚠️`, 'error');
        }
    }
});


document.querySelector("#create-marketplace").addEventListener('click', (e) => {
    e.preventDefault();
    createMarket(userName);
});

document.querySelector("#join-btn").addEventListener('click', (e) => {
    e.preventDefault();
    const topicHex = document.querySelector('#join-topic').value;
    if (topicHex === '') {
        alert('Please fill the input.');
        return;
    }
    joinMarket(userName, topicHex);
});

async function notification(msg, type) {
    const container = document.createElement('div');
    container.classList.add('notification');
    const messageTitle = document.createElement('p');
    messageTitle.classList.add('notification-p');
    messageTitle.textContent = `${type} message!!!`;
    const message = document.createElement('p');
    message.classList.add('notification-msg');
    message.textContent = msg;
    if(type === 'success'){
        container.style.border = "0.5px solid #52cb98";
    } else if(type === 'warning'){
        container.style.border = "0.5px solid #ffb545";
    } else if(type === 'alert'){
        container.style.border = "0.5px solid #6a2b2b";
    } else {
        container.style.border = "0.5px solid #6ab9ff";
    }
    container.appendChild(messageTitle);
    container.appendChild(message);
    document.body.appendChild(container);

    setTimeout(() => {
        container.classList.add('hidden');
    }, 3000)
}

document.querySelector('#add-product-form-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    const productName = document.querySelector('#product-name-input').value;
    const productPrice = document.querySelector('#product-price-input').value;
    const productDesc = document.querySelector('#product-description-input').value;
    const topic = document.querySelector('#room-topic').textContent;
    if (!productName || !productPrice || !productDesc) {
        notification('Please fill all the inputs.', 'warning');
        return;
    }
    try {
        const marketData = await marketStore.get(topic);
        const marketDetails = JSON.parse(marketData);
        if(!marketDetails.products){
            marketDetails.products = [];
        }        
        const newProduct = {
            pid: generateUID(),
            name: productName,
            price: productPrice,
            description: productDesc,
            addedBy: userName,
            addedAt: new Date().toISOString(),
        };

        marketDetails.products.push(newProduct);
        await marketStore.add(topic, JSON.stringify(marketDetails));
        notification('Product added successfully!', 'success');
        document.querySelector('#product-name-input').value = '';
        document.querySelector('#product-price-input').value = '';
        document.querySelector('#product-description-input').value = '';
        console.log('Updated Marketplace Details:', marketDetails);
        reloadProductList(marketDetails, isAdmin);
    } catch (error) {
        console.error('Adding product error : ', error);   
    }
});

function reloadProductList(marketDetails, isAdmin) {
    const productListContainer = document.querySelector('.productList--area');
    productListContainer.innerHTML = generateProductList(marketDetails.products, isAdmin);

    if (isAdmin && marketDetails.products && marketDetails.products.length > 0) {
        const editButtons = productListContainer.querySelectorAll('.edit-btn');
        const deleteButtons = productListContainer.querySelectorAll('.delete-btn');
        editButtons.forEach((button, index) => {
            button.addEventListener('click', () => editProduct(marketDetails.products[index]));
        });
        deleteButtons.forEach((button, index) => {
            button.addEventListener('click', async () => {
                try {
                    const updatedMarketDetails = await deleteProduct(
                        marketDetails.products[index], 
                        marketDetails, 
                        isAdmin
                    );
                    reloadProductList(updatedMarketDetails, isAdmin);
                } catch (error) {
                    notification("Failed to delete the product.", "alert");
                }
            });
        });
        
    }
}
