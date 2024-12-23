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

export function generateProductList(products, isAdmin) {
    if (!products || products.length === 0) {
        return '<p style="color: #777;">No products available.</p>';
    }
    let tableHTML = `
        <table><thead><tr>
                    <th>Name</th>
                    <th>Price (in mBTC)</th>
                    <th>Description</th>
                    <th>Added By</th>
                    <th>Added At</th>
                    ${isAdmin ? '<th>Options</th>' : ''}
        </tr></thead><tbody>
    `;

    products.forEach(product => {
        tableHTML += `
            <tr data-id=${product.pid}>
                <td>${product.name}</td>
                <td>${product.price}</td>
                <td>${product.description}</td>
                <td>${product.addedBy}</td>
                <td>${new Date(product.addedAt).toLocaleString()}</td>
                ${isAdmin ? `
                <td>
                    <button style="color: cornflowerblue;" class="option-btn edit-btn">Edit</button>
                    <button style="color: #ff5555;" class="option-btn delete-btn">Delete</button>
                </td>` : ''}
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
            </table>
    `;

    return tableHTML;
}

export async function deleteProduct(product, marketDetails, isAdmin) {
    if (!isAdmin) {
        console.error("Only admins can delete products!");
        return;
    }
    const updatedProducts = marketDetails.products.filter(p => p.pid !== product.pid);
    marketDetails.products = updatedProducts;
    try {
        await marketStore.add(marketDetails.topic, JSON.stringify(marketDetails));
        console.log("Product deleted successfully:", product);
        return marketDetails;
    } catch (error) {
        console.error("Error deleting product:", error);
        throw error;
    }
}

export function editProduct(){}