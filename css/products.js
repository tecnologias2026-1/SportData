// ============================================
// PRODUCT DATABASE
// ============================================

const PRODUCTS = [
    {
        id: 'NK-RNP-001',
        name: 'Zapatillas Running Pro',
        brand: 'Nike',
        category: 'Calzado',
        price: 89.99,
        image: '../assets/img/main_produc_zapatillas.jpg',
        rating: 4.2,
        reviews: 128,
        description: 'Diseñadas para corredores que buscan máximo rendimiento y comodidad. Las Zapatillas Running Pro de Nike combinan tecnología avanzada con un diseño moderno. Perfectas para entrenamientos diarios y competencias.',
        specifications: {
            general: {
                model: 'Running Pro 2024',
                brand: 'Nike',
                category: 'Calzado Deportivo'
            },
            technical: {
                weight: '245g (tamaño 42)',
                material: 'Mesh de nylon y poliéster',
                sole: 'Goma de carbono',
                cushioning: 'Air Max Cushioning System'
            },
            performance: {
                footType: 'Neutral',
                drop: '10mm',
                recommendedUse: 'Correr en carretera',
                experienceLevel: 'Principiante a Avanzado'
            },
            care: {
                cleaning: 'Lavar a mano con agua tibia',
                drying: 'Al aire libre, no exponer al sol directo',
                storage: 'Lugar fresco y seco',
                durability: '500-800 km de uso'
            }
        },
        sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
        colors: [
            { name: 'Negro', hex: '#000000' },
            { name: 'Azul Eléctrico', hex: '#3B82F6' },
            { name: 'Rojo', hex: '#EF4444' },
            { name: 'Naranja', hex: '#F59E0B' },
            { name: 'Blanco', hex: '#FFFFFF' }
        ]
    },
    {
        id: 'AD-BOT-002',
        name: 'Botín de Skateboarding',
        brand: 'Adidas',
        category: 'Calzado',
        price: 45.00,
        image: '../assets/img/botin_skateboarding.jpg',
        rating: 4.5,
        reviews: 89,
        description: 'Botín especializado para skateboarding con soporte lateral reforzado y protección en puntos de desgaste. Diseño clásico con tecnología moderna para máxima durabilidad y control.',
        specifications: {
            general: {
                model: 'Skate Elite 2024',
                brand: 'Adidas',
                category: 'Calzado Deportivo'
            },
            technical: {
                weight: '320g (tamaño 42)',
                material: 'Cuero sintético con refuerzos',
                sole: 'Goma Vulcanizada',
                cushioning: 'Espuma EVA'
            },
            performance: {
                footType: 'Normal',
                drop: '5mm',
                recommendedUse: 'Skateboarding',
                experienceLevel: 'Principiante a Avanzado'
            },
            care: {
                cleaning: 'Limpiar con paño húmedo',
                drying: 'Al aire libre',
                storage: 'Lugar seco',
                durability: '300-500 km de uso'
            }
        },
        sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44'],
        colors: [
            { name: 'Negro', hex: '#000000' },
            { name: 'Blanco', hex: '#FFFFFF' },
            { name: 'Gris', hex: '#808080' }
        ]
    },
    {
        id: 'NK-MOCH-003',
        name: 'Mochila de Yoga Premium',
        brand: 'Nike',
        category: 'Ropa',
        price: 35.99,
        image: '../assets/img/mochila de yoga.jpg',
        rating: 4.8,
        reviews: 156,
        description: 'Mochila premium diseñada específicamente para yoga y actividades fitness. Con compartimentos especializados, correas ergonómicas y materiales sostenibles.',
        specifications: {
            general: {
                model: 'Yoga Pro Pack',
                brand: 'Nike',
                category: 'Accesorios'
            },
            technical: {
                weight: '480g',
                material: 'Poliéster reciclado',
                capacity: '20L',
                waterResistance: 'Sí'
            },
            performance: {
                usage: 'Yoga y Fitness',
                compartments: 'Múltiples bolsillos',
                strapType: 'Ergonómica acolchada',
                ventilation: 'Paneles transpirables'
            },
            care: {
                cleaning: 'Lavar a mano en agua tibia',
                drying: 'Al aire libre',
                storage: 'Guardar en lugar seco',
                durability: '2-3 años de uso intenso'
            }
        },
        sizes: ['Única'],
        colors: [
            { name: 'Negro', hex: '#000000' },
            { name: 'Rojo', hex: '#EF4444' },
            { name: 'Azul', hex: '#3B82F6' }
        ]
    },
    {
        id: 'PU-CAM-004',
        name: 'Camiseta Deportiva',
        brand: 'Puma',
        category: 'Ropa',
        price: 29.99,
        image: '../assets/img/main_produc_camiseta.jpg',
        rating: 3.9,
        reviews: 102,
        description: 'Camiseta deportiva versátil hecha con tecnología DryCell que mantiene la piel seca y fresca. Perfecta para entrenamientos intensos y uso casual.',
        specifications: {
            general: {
                model: 'DryCell Tee 2024',
                brand: 'Puma',
                category: 'Ropa Deportiva'
            },
            technical: {
                material: 'Poliéster 100%',
                weight: '150g',
                fit: 'Regular',
                technology: 'DryCell - Absorción de humedad'
            },
            performance: {
                usage: 'Entrenamiento y Casual',
                breathability: 'Alta',
                stretchiness: 'Elástica',
                durability: 'Resistente al desgarre'
            },
            care: {
                cleaning: 'Lavar en agua fría, volteada',
                drying: 'Secadora a baja temperatura',
                storage: 'Doblada o colgada',
                durability: '2-3 años con cuidado adecuado'
            }
        },
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        colors: [
            { name: 'Negro', hex: '#000000' },
            { name: 'Blanco', hex: '#FFFFFF' },
            { name: 'Azul', hex: '#3B82F6' },
            { name: 'Rojo', hex: '#EF4444' }
        ]
    },
    {
        id: 'AD-BAL-005',
        name: 'Balón de Futbol',
        brand: 'Adidas',
        category: 'Balones',
        price: 35.99,
        image: '../assets/img/balon de futbol.jpg',
        rating: 4.2,
        reviews: 201,
        description: 'Balón de futbol profesional con paneles termosellados para máxima durabilidad. Diseño de bajo rebote y control óptimo para todo tipo de juego.',
        specifications: {
            general: {
                model: 'Telstar Pro',
                brand: 'Adidas',
                category: 'Balones'
            },
            technical: {
                material: 'Cuero sintético de PU',
                weight: '410-450g',
                circumference: '68-70cm',
                bladderMaterial: 'Butilo'
            },
            performance: {
                ballType: 'Futbol asociación',
                surfaceRecommendation: 'Césped natural y artificial',
                bounceControl: 'Bajo rebote',
                accuracy: 'Excelente control'
            },
            care: {
                cleaning: 'Limpiar con paño húmedo después del uso',
                drying: 'Al aire libre',
                inflation: 'Mantener entre 0.6-1.1 bar',
                durability: '1-2 temporadas'
            }
        },
        sizes: ['Único (Oficial)'],
        colors: [
            { name: 'Blanco con Negro', hex: '#FFFFFF' },
            { name: 'Blanco con Azul', hex: '#FFFFFF' }
        ]
    },
    {
        id: 'NK-MANC-006',
        name: 'Mancuerna Ajustable',
        brand: 'Nike',
        category: 'Fitness',
        price: 120.00,
        image: '../assets/img/mancuerna ajustable.jpg',
        rating: 4.1,
        reviews: 78,
        description: 'Mancuerna ajustable con incrementos de 2.5kg, ideal para entrenamientos progresivos. Agarre cómodo y seguro con tecnología de ajuste rápido.',
        specifications: {
            general: {
                model: 'FlexDumbell Pro',
                brand: 'Nike',
                category: 'Equipo Fitness'
            },
            technical: {
                material: 'Hierro fundido con mango de neopreno',
                weight: '2.5kg - 20kg (ajustable)',
                dimensions: 'Ergonómicas',
                adjustment: 'Sistema de clip rápido'
            },
            performance: {
                usage: 'Entrenamiento de fuerza',
                versatility: 'Múltiples ejercicios',
                durability: 'Muy resistente',
                balance: 'Perfectamente balanceada'
            },
            care: {
                cleaning: 'Limpiar con paño seco',
                drying: 'No requiere secado',
                storage: 'En estante o base',
                durability: '5+ años de uso intenso'
            }
        },
        sizes: ['2.5kg', '5kg', '7.5kg', '10kg', '12.5kg', '15kg', '17.5kg', '20kg'],
        colors: [
            { name: 'Negro', hex: '#000000' },
            { name: 'Gris', hex: '#808080' }
        ]
    },
    {
        id: 'HM-BAND-007',
        name: 'Banda de Entrenamiento',
        brand: 'Hummel',
        category: 'Gimnasio',
        price: 24.99,
        image: '../assets/img/banda entrenamiento.jpg',
        rating: 4.5,
        reviews: 134,
        description: 'Banda elástica de entrenamiento con múltiples niveles de resistencia. Perfecta para rehabilitación, pilates y entrenamiento funcional.',
        specifications: {
            general: {
                model: 'ResistancePro Band',
                brand: 'Hummel',
                category: 'Accesorios Fitness'
            },
            technical: {
                material: 'Látex natural sin ftalatos',
                resistance: '4 niveles (Ligero, Medio, Fuerte, Extra fuerte)',
                length: '120cm',
                width: '15cm'
            },
            performance: {
                usage: 'Rehabilitación y Fitness',
                exercises: '100+ ejercicios posibles',
                portability: 'Ultra portátil',
                safety: 'No tóxica y eco-friendly'
            },
            care: {
                cleaning: 'Lavar con agua y jabón suave',
                drying: 'Al aire libre',
                storage: 'Guardada en bolsa protectora',
                durability: '2-3 años con uso regular'
            }
        },
        sizes: ['Única'],
        colors: [
            { name: 'Rojo', hex: '#EF4444' },
            { name: 'Verde', hex: '#10B981' },
            { name: 'Azul', hex: '#3B82F6' },
            { name: 'Púrpura', hex: '#8B5CF6' }
        ]
    },
    {
        id: 'PU-GAF-008',
        name: 'Gafas de Natación',
        brand: 'Puma',
        category: 'Natación',
        price: 79.99,
        image: '../assets/img/gafas natacion.jpg',
        rating: 4.3,
        reviews: 95,
        description: 'Gafas de natación profesionales con lentes anti-empañamiento y protección UV. Ajuste cómodo para horas de entrenamiento en piscina.',
        specifications: {
            general: {
                model: 'Aqua Pro 2024',
                brand: 'Puma',
                category: 'Accesorios Natación'
            },
            technical: {
                lensType: 'Policarbonato',
                uvProtection: 'Sí (100% UVA/UVB)',
                antifogging: 'Revestimiento permanente',
                frameMaterial: 'Silicona hipoalergénica'
            },
            performance: {
                fieldOfView: '180°',
                waterResistance: 'Completamente sumergible',
                comfort: 'Almohadillas acolchadas',
                durability: 'Resistente al cloro'
            },
            care: {
                cleaning: 'Enjuagar con agua dulce después de usar',
                drying: 'Al aire libre',
                storage: 'En estuche protector',
                durability: '2 años de uso regular'
            }
        },
        sizes: ['Ajustable'],
        colors: [
            { name: 'Negro', hex: '#000000' },
            { name: 'Blanco', hex: '#FFFFFF' },
            { name: 'Azul', hex: '#3B82F6' }
        ]
    },
    {
        id: 'NK-ZAP-009',
        name: 'Zapatillas Training',
        brand: 'Nike',
        category: 'Calzado',
        price: 75.00,
        image: '../assets/img/zapatillas running.jpg',
        rating: 4.7,
        reviews: 167,
        description: 'Zapatillas de entrenamiento versátiles para crossfit, gym y deportes. Soporte lateral reforzado y amortiguación equilibrada para múltiples actividades.',
        specifications: {
            general: {
                model: 'Training Elite 2024',
                brand: 'Nike',
                category: 'Calzado Deportivo'
            },
            technical: {
                weight: '280g (tamaño 42)',
                material: 'Malla y sintético reforzado',
                sole: 'Goma de tracción',
                cushioning: 'React Foam'
            },
            performance: {
                footType: 'Neutral',
                drop: '8mm',
                recommendedUse: 'Crossfit, Gym, Deportes múltiples',
                experienceLevel: 'Todos los niveles'
            },
            care: {
                cleaning: 'Lavar a mano o lavadora fría',
                drying: 'Al aire libre, alejado del calor',
                storage: 'En lugar seco',
                durability: '600-900 horas de uso'
            }
        },
        sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
        colors: [
            { name: 'Negro', hex: '#000000' },
            { name: 'Gris', hex: '#808080' },
            { name: 'Azul Marino', hex: '#1E40AF' },
            { name: 'Rojo', hex: '#EF4444' }
        ]
    },
    {
        id: 'SP-BAL-010',
        name: 'Balón de Baloncesto',
        brand: 'Spalding',
        category: 'Balones',
        price: 45.00,
        image: '../assets/img/main_produc_basquet.jpg',
        rating: 4.8,
        reviews: 156,
        description: 'Balón de baloncesto oficial Spalding con cubierta de cuero sintético de alta calidad. Perfecto para entrenamiento en cancha cubierta y al aire libre.',
        specifications: {
            general: {
                model: 'Spalding All Court',
                brand: 'Spalding',
                category: 'Balones Deportivos'
            },
            technical: {
                material: 'Cuero sintético',
                weight: '600g',
                circumference: '75.5-78cm',
                bladderMaterial: 'Butilo'
            },
            performance: {
                ballType: 'Baloncesto',
                surfaceRecommendation: 'Interior y exterior',
                bounceControl: 'Excelente',
                grip: 'Óptimo en todas las condiciones'
            },
            care: {
                cleaning: 'Limpiar con paño húmedo suave',
                drying: 'Al aire libre',
                inflation: 'Mantener entre 7-9 PSI',
                durability: '2-3 temporadas'
            }
        },
        sizes: ['Único (Oficial)'],
        colors: [
            { name: 'Naranja con Negro', hex: '#F59E0B' },
            { name: 'Rojo con Negro', hex: '#EF4444' }
        ]
    },
    {
        id: 'MK-ESTER-011',
        name: 'Esterilla de Yoga Premium',
        brand: 'Manduka',
        category: 'Fitness',
        price: 35.99,
        image: '../assets/img/main_produc_estirilla.jpg',
        rating: 4.7,
        reviews: 189,
        description: 'Esterilla de yoga premium con amortiguación superior y base antideslizante. Diseño reversible con colores vibrantes, perfecta para todas las prácticas de yoga.',
        specifications: {
            general: {
                model: 'Manduka Pro Lite',
                brand: 'Manduka',
                category: 'Accesorios Fitness'
            },
            technical: {
                material: 'Poliuretano cerrado',
                thickness: '4.7mm',
                weight: '1.6kg',
                dimensions: '180cm x 61cm'
            },
            performance: {
                cushioning: 'Excelente absorción de impacto',
                grip: 'Superior en ambos lados',
                portability: 'Ligera y portable',
                durability: 'Muy durable'
            },
            care: {
                cleaning: 'Lavar con agua tibia y detergente suave',
                drying: 'Colgada o al aire libre',
                storage: 'Enrollada o plana en lugar seco',
                durability: '5-10 años con cuidado adecuado'
            }
        },
        sizes: ['Única'],
        colors: [
            { name: 'Púrpura', hex: '#8B5CF6' },
            { name: 'Azul Oceano', hex: '#0369A1' },
            { name: 'Verde Salvia', hex: '#16A34A' },
            { name: 'Rosa Chicle', hex: '#EC4899' }
        ]
    }
];

// Function to get product by ID
function getProductById(productId) {
    return PRODUCTS.find(product => product.id === productId);
}

// Function to get all products
function getAllProducts() {
    return PRODUCTS;
}

// Function to search products
function searchProducts(query) {
    const lowerQuery = query.toLowerCase();
    return PRODUCTS.filter(product => 
        product.name.toLowerCase().includes(lowerQuery) ||
        product.brand.toLowerCase().includes(lowerQuery) ||
        product.category.toLowerCase().includes(lowerQuery)
    );
}

// Function to filter by category
function filterByCategory(category) {
    if (category === 'todos') return PRODUCTS;
    return PRODUCTS.filter(product => product.category.toLowerCase() === category.toLowerCase());
}

// Function to filter by brand
function filterByBrand(brand) {
    return PRODUCTS.filter(product => product.brand.toLowerCase() === brand.toLowerCase());
}

// Function to sort products
function sortProducts(products, sortBy) {
    const sorted = [...products];
    
    switch(sortBy) {
        case 'price-asc':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'rating':
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        case 'newest':
            // Maintain order or reverse
            sorted.reverse();
            break;
        default:
            // Keep original order (relevance)
            break;
    }
    
    return sorted;
}
