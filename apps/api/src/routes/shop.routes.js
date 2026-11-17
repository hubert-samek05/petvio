const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { getCategories, getProducts, getProduct, getCheckoutLink, getCheckoutInfo, createOrder, validateCode, getPaczkomaty, checkDelivery, getMyOrders } = require('../controllers/shop.controller');

router.use(authenticateToken);
router.get('/categories', getCategories);
router.get('/products', getProducts);
router.get('/products/:id', getProduct);
router.get('/my-orders', getMyOrders);
router.get('/checkout-link', getCheckoutLink);
router.get('/checkout-info', getCheckoutInfo);
router.post('/order', createOrder);
router.post('/validate-code', validateCode);
router.post('/check-delivery', checkDelivery);
router.get('/paczkomaty', getPaczkomaty);

module.exports = router;
