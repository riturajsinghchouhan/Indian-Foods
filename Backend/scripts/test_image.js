import http from 'http';

http.get('http://localhost:5000/api/v1/uploads/food/items/food_022aa488.webp', (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
