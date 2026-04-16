/* ============================================
   PRODUCT PAGE - JAVASCRIPT (DYNAMIC)
   ============================================ */

// State management for product page
const productState = {
    currentProduct: null,
    selectedSize: null,
    selectedColor: null,
    quantity: 1,
    favorites: []
};

// Initialize product page
document.addEventListener('DOMContentLoaded', function() {
    loadProductFromURL();
    loadFavorites();
    setupProductFavorite();
    setupQuantityControls();
    setupSizeSelection();
    setupColorSelection();
    setupAddToCart();
});

// ============================================
// LOAD PRODUCT FROM URL
// ============================================

function loadProductFromURL() {
    // Get product ID from URL parameters
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        // If no ID, default to first product
        productState.currentProduct = getProductById('NK-RNP-001');
    } else {
        productState.currentProduct = getProductById(productId);
    }

    if (productState.currentProduct) {
        renderProductData();
        trackProductView();
    } else {
        console.error('Producto no encontrado');
        // Redirect to catalog if product not found
        window.location.href = 'catalog.html';
    }
}

// ============================================
// RENDER PRODUCT DATA
// ============================================

function renderProductData() {
    const product = productState.currentProduct;

    // Update breadcrumb
    const breadcrumbCurrent = document.querySelector('.breadcrumb__current');
    if (breadcrumbCurrent) {
        breadcrumbCurrent.textContent = product.name;
    }

    // Update page title
    document.title = `${product.name} - SportData`;

    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.setAttribute('content', `SportData - ${product.name}. Compra este producto deportivo.`);
    }

    // Update product image
    const productImage = document.querySelector('.product-image');
    if (productImage) {
        productImage.src = product.image;
        productImage.alt = product.name;
    }

    // Update product metadata
    const productCategory = document.querySelector('.product-category');
    if (productCategory) {
        productCategory.textContent = product.category;
    }

    const productBrand = document.querySelector('.product-brand');
    if (productBrand) {
        productBrand.textContent = product.brand;
    }

    // Update product title
    const productTitle = document.querySelector('.product-title');
    if (productTitle) {
        productTitle.textContent = product.name;
        productTitle.id = `product-${product.id}`;
    }

    // Update rating
    updateRating(product.rating, product.reviews);

    // Update price
    const productPrice = document.querySelector('.product-price');
    if (productPrice) {
        productPrice.textContent = `$${product.price.toFixed(2)}`;
    }

    // Update description
    const productDesc = document.querySelector('.product-description');
    if (productDesc) {
        productDesc.textContent = product.description;
    }

    // Update specifications
    renderSpecifications(product);

    // Update size options
    renderSizeOptions(product);

    // Update color options
    renderColorOptions(product);

    // Set initial selections
    if (product.sizes && product.sizes.length > 0) {
        productState.selectedSize = product.sizes[0];
    }
    if (product.colors && product.colors.length > 0) {
        productState.selectedColor = product.colors[0].hex;
    }
}

// ============================================
// UPDATE RATING
// ============================================

function updateRating(rating, reviewCount) {
    const starRating = document.querySelector('.star-rating');
    if (starRating) {
        starRating.innerHTML = generateStars(rating);
        starRating.setAttribute('aria-label', `Calificación: ${rating} de 5 estrellas`);
    }

    const ratingValue = document.querySelector('.rating-value');
    if (ratingValue) {
        ratingValue.textContent = rating.toFixed(1) + ' de 5';
    }

    const reviewCount_ = document.querySelector('.review-count');
    if (reviewCount_) {
        reviewCount_.textContent = `(${reviewCount} reseñas)`;
    }
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars += '<span class="star star--filled"></span>';
        } else if (i - rating < 1 && rating % 1 !== 0) {
            stars += '<span class="star star--half"></span>';
        } else {
            stars += '<span class="star"></span>';
        }
    }
    return stars;
}

// ============================================
// RENDER SPECIFICATIONS
// ============================================

function renderSpecifications(product) {
    const specsGrid = document.querySelector('.specs-grid');
    if (!specsGrid) return;

    // Clear existing specs
    const existingSpecs = specsGrid.querySelectorAll('.specs-category');
    existingSpecs.forEach(spec => spec.remove());

    // Dynamically render each specification category
    const categories = [
        {
            title: 'Información General',
            data: product.specifications.general
        },
        {
            title: 'Características Técnicas',
            data: product.specifications.technical
        },
        {
            title: 'Características de Desempeño',
            data: product.specifications.performance
        },
        {
            title: 'Cuidado y Mantenimiento',
            data: product.specifications.care
        }
    ];

    categories.forEach(category => {
        const specCategory = createSpecCategory(category.title, category.data);
        specsGrid.appendChild(specCategory);
    });

    // Add sizes section
    if (product.sizes && product.sizes.length > 0) {
        const sizesSection = createSizesSection(product.sizes);
        specsGrid.appendChild(sizesSection);
    }

    // Add colors section
    if (product.colors && product.colors.length > 0) {
        const colorsSection = createColorsSection(product.colors);
        specsGrid.appendChild(colorsSection);
    }
}

function createSpecCategory(title, data) {
    const div = document.createElement('div');
    div.className = 'specs-category';

    let html = `<h3 class="specs-category-title">${title}</h3><ul class="specs-list">`;

    for (const [key, value] of Object.entries(data)) {
        const label = formatLabel(key);
        html += `<li class="spec-item"><span class="spec-label">${label}:</span><span class="spec-value">${value}</span></li>`;
    }

    html += '</ul>';
    div.innerHTML = html;
    return div;
}

function createSizesSection(sizes) {
    const div = document.createElement('div');
    div.className = 'specs-category';

    let html = `<h3 class="specs-category-title">Tallas Disponibles</h3><div class="size-options">`;

    sizes.forEach((size, index) => {
        const isActive = index === 0 ? 'active' : '';
        html += `<button class="size-btn ${isActive}">${size}</button>`;
    });

    html += '</div>';
    div.innerHTML = html;
    return div;
}

function createColorsSection(colors) {
    const div = document.createElement('div');
    div.className = 'specs-category';

    let html = `<h3 class="specs-category-title">Colores Disponibles</h3><div class="color-options">`;

    colors.forEach((color, index) => {
        const isActive = index === 0 ? 'active' : '';
        const borderStyle = color.hex === '#FFFFFF' ? 'border: 1px solid #E5E7EB;' : '';
        html += `<div class="color-btn ${isActive}" style="background-color: ${color.hex}; ${borderStyle}" title="${color.name}"></div>`;
    });

    html += '</div>';
    div.innerHTML = html;
    return div;
}

function formatLabel(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

// ============================================
// RENDER SIZE AND COLOR OPTIONS
// ============================================

function renderSizeOptions(product) {
    // Will be rendered dynamically in renderSpecifications
}

function renderColorOptions(product) {
    // Will be rendered dynamically in renderSpecifications
}

// ============================================
// FAVORITES FUNCTIONALITY
// ============================================

function setupProductFavorite() {
    const favoriteBtn = document.querySelector('.product-favorite-btn');
    if (!favoriteBtn) return;

    // Load favorite state from localStorage
    if (isFavorited(productState.currentProduct.id)) {
        favoriteBtn.setAttribute('data-favorite', 'true');
    }

    favoriteBtn.addEventListener('click', function(e) {
        e.preventDefault();
        toggleProductFavorite(favoriteBtn);
    });
}

function toggleProductFavorite(btn) {
    const isFav = btn.getAttribute('data-favorite') === 'true';
    
    if (isFav) {
        removeFavorite(productState.currentProduct.id);
        btn.setAttribute('data-favorite', 'false');
    } else {
        addFavorite(productState.currentProduct.id);
        btn.setAttribute('data-favorite', 'true');
    }
    
    saveFavorites();
}

function addFavorite(productId) {
    if (!productState.favorites.includes(productId)) {
        productState.favorites.push(productId);
    }
}

function removeFavorite(productId) {
    productState.favorites = productState.favorites.filter(id => id !== productId);
}

function isFavorited(productId) {
    return productState.favorites.includes(productId);
}

function loadFavorites() {
    const stored = localStorage.getItem('favorites');
    if (stored) {
        try {
            productState.favorites = JSON.parse(stored);
        } catch (e) {
            productState.favorites = [];
        }
    }
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(productState.favorites));
}

// ============================================
// QUANTITY CONTROLS
// ============================================

function setupQuantityControls() {
    const decreaseBtn = document.getElementById('decreaseQty');
    const increaseBtn = document.getElementById('increaseQty');
    const quantityInput = document.getElementById('quantity');

    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', function() {
            const currentValue = parseInt(quantityInput.value) || 1;
            const newValue = Math.max(1, currentValue - 1);
            quantityInput.value = newValue;
            productState.quantity = newValue;
        });
    }

    if (increaseBtn) {
        increaseBtn.addEventListener('click', function() {
            const currentValue = parseInt(quantityInput.value) || 1;
            const newValue = Math.min(10, currentValue + 1);
            quantityInput.value = newValue;
            productState.quantity = newValue;
        });
    }

    if (quantityInput) {
        quantityInput.addEventListener('change', function() {
            let value = parseInt(this.value) || 1;
            value = Math.max(1, Math.min(10, value));
            this.value = value;
            productState.quantity = value;
        });
    }
}

// ============================================
// SIZE SELECTION
// ============================================

function setupSizeSelection() {
    // Will set up dynamically after rendering
    setTimeout(() => {
        const sizeButtons = document.querySelectorAll('.size-btn');
        sizeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                sizeButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                productState.selectedSize = this.textContent.trim();
            });
        });
    }, 100);
}

// ============================================
// COLOR SELECTION
// ============================================

function setupColorSelection() {
    // Will set up dynamically after rendering
    setTimeout(() => {
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                colorButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const bgColor = window.getComputedStyle(this).backgroundColor;
                productState.selectedColor = bgColor;
            });
        });
    }, 100);
}

// ============================================
// ADD TO CART
// ============================================

function setupAddToCart() {
    const addToCartBtn = document.querySelector('.btn-add-cart');

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            addProductToCart();
        });
    }
}

function addProductToCart() {
    const product = productState.currentProduct;

    // Create cart item object
    const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: productState.quantity,
        size: productState.selectedSize,
        color: productState.selectedColor,
        image: product.image,
        addedAt: new Date().toISOString()
    };

    // Get existing cart from localStorage
    let cart = [];
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
        try {
            cart = JSON.parse(storedCart);
        } catch (e) {
            cart = [];
        }
    }

    // Check if product with same specs already in cart
    const existingItem = cart.find(item => 
        item.id === cartItem.id && 
        item.size === cartItem.size && 
        item.color === cartItem.color
    );

    if (existingItem) {
        existingItem.quantity += cartItem.quantity;
    } else {
        cart.push(cartItem);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    showAddToCartFeedback();
    updateCartCount();
}

function showAddToCartFeedback() {
    const btn = document.querySelector('.btn-add-cart');
    const originalText = btn.innerHTML;
    const quantity = productState.quantity;

    // Change button text
    btn.innerHTML = `✓ ${quantity} artículo(s) agregado`;
    btn.style.backgroundColor = '#22863a';

    // Reset after 2 seconds
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.backgroundColor = '';
    }, 2000);
}

function updateCartCount() {
    // Get cart from localStorage
    let cart = [];
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
        try {
            cart = JSON.parse(storedCart);
        } catch (e) {
            cart = [];
        }
    }

    // Calculate total items
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Update all cart links in navigation (if they exist)
    const cartLinks = document.querySelectorAll('a[href="cart.html"], a[href="./cart.html"]');
    cartLinks.forEach(link => {
        // Note: This would need proper implementation in the full nav structure
        // For now, this is a placeholder for future cart count display
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', function(e) {
    // Add to cart with Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const addToCartBtn = document.querySelector('.btn-add-cart');
        if (addToCartBtn) {
            addToCartBtn.click();
        }
    }
});

// ============================================
// ANALYTICS TRACKING
// ============================================

function trackProductView() {
    const product = productState.currentProduct;
    const productData = {
        productId: product.id,
        productName: product.name,
        viewedAt: new Date().toISOString()
    };
    
    let pageViews = [];
    const stored = localStorage.getItem('pageViews');
    if (stored) {
        try {
            pageViews = JSON.parse(stored);
        } catch (e) {
            pageViews = [];
        }
    }
    
    pageViews.push(productData);
    
    if (pageViews.length > 50) {
        pageViews = pageViews.slice(-50);
    }
    
    localStorage.setItem('pageViews', JSON.stringify(pageViews));
}
