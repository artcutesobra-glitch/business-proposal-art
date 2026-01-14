const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");

let currentEditingProposalId = null;
let addOrderMode = false;

let proposalSaved = false;
let viewOnlyMode = false;

/* ======================
   INDEXEDDB SETUP
====================== */
let db;

const request = indexedDB.open("BusinessProposalDB", 3);

request.onupgradeneeded = e => {
  db = e.target.result;

  if (!db.objectStoreNames.contains("proposals")) {
    db.createObjectStore("proposals", {
      keyPath: "id",
      autoIncrement: true
    });
  }

  if (!db.objectStoreNames.contains("products")) {
    db.createObjectStore("products", {
      keyPath: "id"
    });
  }
};


request.onsuccess = e => {
  db = e.target.result;
  console.log("IndexedDB ready");
  loadProducts(); // 🔥 ITO ANG KULANG
};


request.onerror = e => {
  console.error("IndexedDB error", e);
};


/* ======================
   NAVIGATION
====================== */
function toggleMenu(){
  sideMenu.classList.add("open");
  menuOverlay.classList.add("show");
}
function closeMenu(){
  sideMenu.classList.remove("open");
  menuOverlay.classList.remove("show");
}
function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  closeMenu();

  if(id === "newProposal"){
  loadBusinessInfo();

  capitalInput.readOnly = true; // 🔒 LOCK CAPITAL

  const btn = document.querySelector("#newProposal .primary-btn");
  btn.textContent = addOrderMode ? "Save New Order" : "Generate Proposal";
}

}


/* ======================
   PRODUCTS DROPDOWN
====================== */
function toggleProducts(){
  document.getElementById("productsDropdown").classList.toggle("show");
}

/* ======================
   PROPOSAL
====================== */
function generateProposal(){

  if(!Object.keys(cart).length){
    showAlert("No selected products", "Notice");
    return;
  }

  if(addOrderMode){
    saveNewOrderOnly();
  } else {
    saveProposal();
  }
}








/* ======================
   DATA
====================== */
let products = [];

/* ======================
   AUTO FIX OLD PRODUCTS (PACK)
====================== */
let needsSave = false;

products.forEach(p=>{
  if(p.pack == null){        // 🔥 old product
    p.pack = 10;             // DEFAULT PACK QTY
    needsSave = true;
  }
});

if(needsSave){
  function saveProducts(){
  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");

  products.forEach(p => store.put(p));
}

}


const cart = {};
const productGrid = document.getElementById("productGrid");
const cartBody = document.getElementById("cartBody");
const totalProfit = document.getElementById("totalProfit");
const productCount = document.getElementById("productCount") || null;
const totalQtyEl = document.getElementById("totalQty");
const totalRetailEl = document.getElementById("totalRetail");
const totalSellingEl = document.getElementById("totalSelling");
// 🔥 DOM REFERENCES (FIX)
const ownerInput = document.getElementById("owner");
const locationInput = document.getElementById("businessLocation");

const capitalInput = document.getElementById("capital");




/* ======================
   PRODUCTS
====================== */
function renderProducts(){
  productGrid.innerHTML = "";

  if(products.length === 0){
    productGrid.innerHTML = `
      <div class="empty-products">📦 No products yet</div>
    `;
    return;
  }

  products.forEach(p=>{
    productGrid.innerHTML += `
      <div class="product-card">

        <div class="product-img-wrap">
          <img src="${p.img || 'https://via.placeholder.com/300'}">
        </div>

        <div class="product-name">
          ${p.name}
        </div>

        <button class="price-btn"
  onclick="addToCart(${p.id}); event.stopPropagation();">
  ₱${(p.retail * p.pack).toLocaleString()}
</button>







      </div>
    `;
  });
}



function addProduct(){

  document.activeElement?.blur(); // 🔥 IMPORTANT

  if(pImg.value.startsWith("data:image")){
    showAlert("Huwag base64 image. Gumamit ng image URL lang.", "Invalid Image");
    return;
  }

  const p = {
    id: Date.now(),
    name: pName.value.trim(),
    retail: Number(pRetail.value),
    selling: Number(pSelling.value),
    img: pImg.value.trim(),
    pack: Number(pPack.value) || 1
  };

  if(!p.name || !p.retail || !p.selling){
    showAlert("Please complete all required fields.", "Incomplete");
    return;
  }

  products.push(p);

  const tx = db.transaction("products", "readwrite");
  tx.objectStore("products").put(p);

  closeAddProductModal();
  renderProducts();

  pName.value = pRetail.value = pSelling.value = pImg.value = pPack.value = "";
}




/* ======================
   EDIT PRODUCT
====================== */
function openEditProduct(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;

  editId.value = p.id;
  editName.value = p.name;
  editRetail.value = p.retail;
  editSelling.value = p.selling;
  editImg.value = p.img || "";
  editPack.value = p.pack || 1;   // 🔥 PACK

  editProductModal.classList.add("show");
}


function closeEditProductModal(){
  editProductModal.classList.remove("show");
}

function saveEditProduct(){
  const id = Number(editId.value);
  const p = products.find(x=>x.id===id);
  if(!p) return;

  p.name = editName.value.trim();
  p.retail = Number(editRetail.value);
  p.selling = Number(editSelling.value);
  p.img = editImg.value.trim();
  p.pack = Number(editPack.value) || 1;   // 🔥 SAVE PACK

  const tx = db.transaction("products", "readwrite");
tx.objectStore("products").put(p);

  closeEditProductModal();
  renderProducts();
}


/* ======================
   CART
====================== */
function addToCart(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;

  cart[id] ??= { ...p, qty:0 };

  cart[id].qty += p.pack;   // 🔥 ADD PER PACK

  renderCart();
}

function renderCart(){
  cartBody.innerHTML = "";

  let totalQty = 0;
  let totalRetail = 0;
  let totalSelling = 0;
  let totalProfitCalc = 0;

  Object.values(cart).forEach(p=>{
    const retailPerPiece = p.retail;
    const sellingPerPiece = p.selling;

    const itemRetail = retailPerPiece * p.qty;
    const itemSelling = sellingPerPiece * p.qty;
    const profit = (sellingPerPiece - retailPerPiece) * p.qty;



    totalQty += p.qty;
    totalRetail += itemRetail;
    totalSelling += itemSelling;
    totalProfitCalc += profit;

    cartBody.innerHTML += `
<tr>
  <td>${p.name}</td>
  <td style="display:flex; align-items:center; gap:6px;">
    <button class="qty-minus"
      onclick="decreaseQty(${p.id})">−</button>

    <span>${p.qty}</span>
  </td>
  <td>₱${itemRetail.toLocaleString()}</td>




  <td>
    
    <input type="number"
      class="selling-edit"
      value="${p.selling}"
      min="1"
      oninput="autoSaveSelling(${p.id}, this.value)">
  </td>

  <td>₱${profit.toLocaleString()}</td>
</tr>
`;

  });

  if(!Object.keys(cart).length){
    cartBody.innerHTML =
      `<tr><td colspan="5">No products selected</td></tr>`;
  }

  totalQtyEl.textContent = totalQty;
  totalRetailEl.textContent = "₱" + totalRetail.toLocaleString();
  totalSellingEl.textContent = "₱" + totalSelling.toLocaleString();
  totalProfit.textContent = "₱" + totalProfitCalc.toLocaleString();
}


/* ======================
   MODALS
====================== */
function openAddProductModal(){
  addProductModal.classList.add("show");
}
function closeAddProductModal(){
  addProductModal.classList.remove("show");
}

/* INIT */
renderProducts();

function openProductManager(){
  const list = document.getElementById("productManagerList");
  list.innerHTML = "";

  if(products.length === 0){
    list.innerHTML = "<p>No products to edit</p>";
  } else {
    products.forEach(p=>{
      list.innerHTML += `
        <div class="manager-row"
             onclick="openEditProductFromManager(${p.id})">
          <b>${p.name}</b>
          <span>✏️</span>
        </div>
      `;
    });
  }

  // 🔥 CLOSE DROPDOWN FIRST
  document.getElementById("productsDropdown").classList.remove("show");

  // OPEN MANAGER
  productManagerModal.classList.add("show");
}


function closeProductManager(){
  productManagerModal.classList.remove("show");
}

function openEditProductFromManager(id){
  closeProductManager();      // close product manager
  openEditProduct(id);        // open edit modal
}

function deleteProduct(){
  const id = Number(editId.value);
  if(!id) return;

  showConfirm("Delete this product?", () => {
    products = products.filter(p => p.id !== id);

    const tx = db.transaction("products", "readwrite");
    tx.objectStore("products").delete(id);

    closeEditProductModal();
    renderProducts();
  }, "Delete Product");
}

function resetCart(){
  if(!Object.keys(cart).length) return;

  showConfirm("Reset all selected products?", () => {
    resetCartConfirmed();
  });
}

function goToBusinessInfo(){

  // ❌ WALANG SELECTED PRODUCTS
  if(!Object.keys(cart).length){
    showAlert(
  "Please select at least one product before proceeding.",
  "No Products Selected"
);

    return; // ⛔ STOP HERE
  }

  // ✅ MAY LAMAN → TULOY
  showPage("newProposal");

  let totalRetail = 0;
  Object.values(cart).forEach(p=>{
    totalRetail += p.retail * p.qty;
  });

  capital.value = totalRetail;
}




function proceedToProposal(){
  if(!Object.keys(cart).length){
    alert("No selected products to proceed");
    return;
  }

  let totalRetail = 0;

  Object.values(cart).forEach(p=>{
    totalRetail += p.retail * p.qty; // 🔥 TAMA NA
  });

  const proposalData = {
    products: Object.values(cart),
    capital: Math.round(totalRetail)
  };

  localStorage.setItem(
    "proposalDraft",
    JSON.stringify(proposalData)
  );

  showPage("newProposal");
  loadProposalDraft();
  generateProposal();
}

function loadProposalDraft(){
  const data = JSON.parse(localStorage.getItem("proposalDraft"));
  if(!data) return;

  // AUTO FILL CAPITAL
  capital.value = data.capital || 0;

  // SHOW PRODUCTS
  const box = document.getElementById("proposalProducts");
  if(!box) return;

  let html = "<ul class='proposal-list'>";

  data.products.forEach(p=>{
    html += `
      <li>
        <b>${p.name}</b>
        <span>${p.qty} pcs</span>
      </li>
    `;
  });

  html += "</ul>";

  box.innerHTML = html;
}
function loadBusinessInfo(){
  const box = document.getElementById("businessProducts");
  if(!box) return;

  if(!Object.keys(cart).length){
    box.innerHTML = "<p>No products selected</p>";
    capital.value = 0;
    return;
  }
  let totalQty = 0;
  let totalRetail = 0;
  let totalSelling = 0;
  let totalProfit = 0;

  let html = `
    <h4>🧾 Selected Products</h4>
    <table class="cart-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th>Retail</th>
          <th>Selling</th>
          <th>Profit</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.values(cart).forEach(p=>{
    const itemRetail = p.retail * p.qty;
    const itemSelling = p.selling * p.qty;
    const profit = itemSelling - itemRetail;

    totalQty += p.qty;
    totalRetail += itemRetail;
    totalSelling += itemSelling;
    totalProfit += profit;

    html += `
      <tr>
        <td>${p.name}</td>
        <td>${p.qty}</td>
        <td>₱${itemRetail.toLocaleString()}</td>
        <td>₱${itemSelling.toLocaleString()}</td>
        <td>₱${profit.toLocaleString()}</td>
      </tr>
    `;
  });

  html += `
  </tbody>
</table>

<div class="summary-box">
  <div class="summary-row">
    <span>Total Qty</span>
    <strong>${totalQty}</strong>
  </div>

  <div class="summary-row">
    <span>Total Retail</span>
    <strong>₱${totalRetail.toLocaleString()}</strong>
  </div>

      <div class="summary-row">
        <span>Total Selling</span>
        <strong>₱${totalSelling.toLocaleString()}</strong>
      </div>
      <div class="summary-row highlight">
        <span>Total Profit</span>
        <strong>₱${totalProfit.toLocaleString()}</strong>
      </div>
    </div>
  `;

  box.innerHTML = html;
  capital.value = totalRetail; // 🔥 AUTO CAPITAL
}

function saveProposal(){
  if(!db){
    showAlert("Database is still loading. Please try again.", "Loading");
    return;
  }

  const data = {
    owner: ownerInput.value || "-",
    location: locationInput.value || "-",
    orders: [
      {
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        capital: Number(capitalInput.value),
        products: Object.values(cart).map(p => ({
          name: p.name,
          qty: p.qty,
          retail: p.retail,
          selling: p.selling
        }))
      }
    ]
  };

  const tx = db.transaction("proposals", "readwrite");
  const store = tx.objectStore("proposals");
  store.add(data);

  tx.oncomplete = () => {
    proposalSaved = true;
    showAlert("Proposal saved successfully!", "Success");
    resetAppState();
    showPage("savedProposals");
    renderSavedProposals();
  };

  tx.onerror = () => {
    showAlert("Failed to save proposal.", "Error");
  };
}


function showSavedProposals(){
  showPage("savedProposals");
  renderSavedProposals();
}

function renderSavedProposals(){
  if(!db) return;

  const box = document.getElementById("savedProposalList");
  box.innerHTML = "";

  const tx = db.transaction("proposals", "readonly");
  const store = tx.objectStore("proposals");
  const req = store.getAll();

  req.onsuccess = () => {
    const saved = req.result;

    if(saved.length === 0){
      box.innerHTML = "<p>No saved proposals</p>";
      return;
    }

    let html = "";

    saved.reverse().forEach(p=>{
  const totalOrders = p.orders?.length || 0;
  const lastOrder = p.orders?.[p.orders.length - 1];

  html += `
    <div class="saved-proposal-card">
      <b>${p.owner}</b>
      <p>📍 ${p.location}</p>
      <p>🧾 Orders: ${totalOrders}</p>
      <small>
        Last order: ${lastOrder?.date || "-"} • ${lastOrder?.time || "-"}
      </small>

      <button class="primary-btn"
        onclick="viewProposal(${p.id})">
        👁 View
      </button>
    </div>
  `;
});


    box.innerHTML = html;
  };
}


function deleteProposal(id){
  const tx = db.transaction("proposals", "readwrite");
  tx.objectStore("proposals").delete(id);
  tx.oncomplete = renderSavedProposals;
}
function viewProposal(id){
  if(!db) return;

  const tx = db.transaction("proposals", "readonly");
  const store = tx.objectStore("proposals");
  const req = store.get(id);

  req.onsuccess = () => {
    const p = req.result;
    if(!p) return;

    if(!p.orders && p.products){
  p.orders = [{
    date: p.date || "-",
    time: p.time || "-",
    capital: p.capital || 0,
    products: p.products
  }];

  // optional cleanup
  delete p.products;
  delete p.date;
  delete p.time;

  // save migrated structure
  const fixTx = db.transaction("proposals", "readwrite");
  fixTx.objectStore("proposals").put(p);
}


    let html = `
      <p><b>Owner:</b> ${p.owner}</p>
      <p><b>Location:</b> ${p.location}</p>
    `;

    const orders = p.orders || [
  {
    date: p.date || "-",
    time: p.time || "-",
    capital: p.capital || 0,
    products: p.products || []
  }
];

orders.forEach((order, index) => {

      let rows = "";
      let totalQty = 0;
      let totalRetail = 0;
      let totalSelling = 0;
      let totalProfit = 0;

      order.products.forEach(item => {
        const itemRetail = item.retail * item.qty;
        const itemSelling = item.selling * item.qty;
        const profit = itemSelling - itemRetail;

        totalQty += item.qty;
        totalRetail += itemRetail;
        totalSelling += itemSelling;
        totalProfit += profit;

        rows += `
          <tr>
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>₱${itemRetail.toLocaleString()}</td>
            <td>₱${itemSelling.toLocaleString()}</td>
            <td>₱${profit.toLocaleString()}</td>
          </tr>
        `;
      });

      const orderNumber = orders.length - index;

html += `
  <hr>
  <div style="display:flex; justify-content:space-between; align-items:center;">
    <h4>🧾 Order ${orderNumber}</h4>
    <button class="danger-btn small-btn"
      onclick="deleteOrder(${id}, ${index})">
      🗑 Delete Order
    </button>
  </div>

  <p><b>Date:</b> ${order.date} • ${order.time}</p>
  <p><b>Capital:</b> ₱${order.capital.toLocaleString()}</p>

  <table class="cart-table">
    <thead>
      <tr>
        <th>Product</th>
        <th>Qty</th>
        <th>Retail</th>
        <th>Selling</th>
        <th>Profit</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="summary-box">
    <div class="summary-row">
      <span>Total Qty</span>
      <strong>${totalQty}</strong>
    </div>
    <div class="summary-row">
      <span>Total Retail</span>
      <strong>₱${totalRetail.toLocaleString()}</strong>
    </div>
    <div class="summary-row">
      <span>Total Selling</span>
      <strong>₱${totalSelling.toLocaleString()}</strong>
    </div>
    <div class="summary-row highlight">
      <span>Total Profit</span>
      <strong>₱${totalProfit.toLocaleString()}</strong>
    </div>
  </div>
`;

    });

    html += `
  <div style="display:flex; gap:10px; margin-top:15px;">
    <button class="reset-btn" onclick="showPage('savedProposals')">
      ⬅ Back
    </button>
    <button class="primary-btn" onclick="startAddNewOrder(${id})">
      ➕ Add New Order
    </button>
    <button class="danger-btn" onclick="deleteAndExit(${id})">
      🗑 Delete Proposal
    </button>
  </div>
`;


    document.getElementById("viewPreview").innerHTML = html;
    showPage("viewProposal");
  };
}


function exitViewMode(){
  viewOnlyMode = false;

  // ENABLE INPUTS AGAIN
  ownerInput.disabled = false;
  locationInput.disabled = false;
  capitalInput.disabled = false;

  // SHOW GENERATE BUTTON AGAIN
  document.querySelector(
    "#newProposal .primary-btn"
  ).style.display = "block";

 

  // BALIK SA SAVED LIST
  showPage("savedProposals");
}
function deleteAndExit(id){
  showConfirm("Delete this proposal?", () => {
    const tx = db.transaction("proposals", "readwrite");
    tx.objectStore("proposals").delete(id);

    tx.oncomplete = () => {
      showAlert("Proposal deleted successfully.", "Success");
      showPage("savedProposals");
      renderSavedProposals();
    };
  }, "Delete Proposal");
}


function autoSaveSelling(id, value){
  const newPrice = Number(value);
  if(newPrice <= 0) return;

  // UPDATE CART
  cart[id].selling = newPrice;

  // UPDATE MASTER PRODUCT (OPTIONAL, PERMANENT)
  const prod = products.find(p => p.id === id);
  if(prod){
    prod.selling = newPrice;
    
  }

  // REALTIME RECALC
  renderCart();
}
function showAlert(message, title = "Notice"){
  promptTitle.textContent = title;
  promptMessage.textContent = message;

  promptCancel.style.display = "none";

  promptOk.onclick = closePrompt;
  promptModal.classList.add("show");
}

function showConfirm(message, onYes, title = "Confirm"){
  promptTitle.textContent = title;
  promptMessage.textContent = message;

  promptCancel.style.display = "inline-block";

  promptOk.onclick = () => {
    closePrompt();
    onYes();
  };

  promptModal.classList.add("show");
}

function closePrompt(){
  promptModal.classList.remove("show");
}

function resetCartConfirmed(){
  for(const k in cart) delete cart[k];
  renderCart();
}
function loadProducts(){
  const tx = db.transaction("products", "readonly");
  const store = tx.objectStore("products");
  const req = store.getAll();

  req.onsuccess = () => {
    products = req.result || [];
    renderProducts();
  };
}
function resetAppState(){
  for(const k in cart) delete cart[k];
  renderCart();

  ownerInput.value = "";
  locationInput.value = "";
  capitalInput.value = "";

  document.querySelector("#newProposal .primary-btn").disabled = false;

  

  viewOnlyMode = false;
  proposalSaved = false;
}

function isTouchDevice(){
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

if(isTouchDevice()){
  let lastTouch = 0;

  document.addEventListener("touchend", e => {
    const now = Date.now();
    if(now - lastTouch <= 300){
      e.preventDefault();
    }
    lastTouch = now;
  }, { passive: false });
}


if(isTouchDevice()){

  // ❌ Disable pinch zoom (gesture)
  document.addEventListener("gesturestart", e => e.preventDefault());
  document.addEventListener("gesturechange", e => e.preventDefault());
  document.addEventListener("gestureend", e => e.preventDefault());

  // ❌ Disable double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener("touchend", e => {
    const now = Date.now();
    if(now - lastTouchEnd <= 300){
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

}
function startAddNewOrder(id){
  currentEditingProposalId = id;
  addOrderMode = true;

  // fresh cart (new order only)
  for(const k in cart) delete cart[k];
  renderCart();

  showPage("home");

  showAlert(
    "Adding new order. Previous orders will not be changed.",
    "New Order"
  );
}
function saveNewOrderOnly(){
  const tx = db.transaction("proposals", "readwrite");
  const store = tx.objectStore("proposals");

  const req = store.get(currentEditingProposalId);

  req.onsuccess = () => {
    const proposal = req.result;
    if(!proposal) return;

    proposal.orders.unshift({
  date: new Date().toLocaleDateString(),
  time: new Date().toLocaleTimeString(),
  capital: Number(capitalInput.value),
  products: Object.values(cart).map(p => ({
    name: p.name,
    qty: p.qty,
    retail: p.retail,
    selling: p.selling
  }))
});

    store.put(proposal);

    tx.oncomplete = () => {
      showAlert("New order added successfully!", "Success");

      addOrderMode = false;
      currentEditingProposalId = null;
      proposalSaved = false; // ensure clean state

      resetAppState();
      showPage("savedProposals");
      renderSavedProposals();
    };
  };
}
function deleteOrder(proposalId, orderIndex){
  showConfirm(
    `Delete Order ${orderIndex + 1}?`,
    () => {

      const tx = db.transaction("proposals", "readwrite");
      const store = tx.objectStore("proposals");
      const req = store.get(proposalId);

      req.onsuccess = () => {
        const proposal = req.result;
        if(!proposal || !proposal.orders) return;

        // ❌ REMOVE SPECIFIC ORDER
        proposal.orders.splice(orderIndex, 1);

        // 🧹 IF NO ORDERS LEFT → DELETE PROPOSAL (OPTIONAL BUT LOGICAL)
        if(proposal.orders.length === 0){
          store.delete(proposalId);

          tx.oncomplete = () => {
            showAlert("Last order deleted. Proposal removed.", "Deleted");
            showPage("savedProposals");
            renderSavedProposals();
          };
          return;
        }

        // ✅ SAVE UPDATED PROPOSAL
        store.put(proposal);

        tx.oncomplete = () => {
          showAlert("Order deleted successfully!", "Success");
          viewProposal(proposalId); // 🔄 refresh preview
        };
      };

    },
    "Delete Order"
  );
}
function decreaseQty(id){
  const p = products.find(x => x.id === id);
  if(!p || !cart[id]) return;

  cart[id].qty -= p.pack; // 🔽 bawas by pack

  if(cart[id].qty <= 0){
    delete cart[id]; // auto remove
  }

  renderCart();
}
