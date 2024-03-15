const http = require('http');
const fs = require('fs');
const qs = require('querystring');
const url = require('url');
const { v4: uuidv4 } = require('uuid');
const ejs = require('ejs');

const PORT = process.PORT || 3001;
const jsonFilePath = './user.json';

let jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
// parse =json string to js object

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    //  takes a URL string as input and returns a URL object containing various components of the URL, 

    if (req.method === 'GET' && req.url === '/') {
        const pageContent = fs.readFileSync('./index.html', 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(pageContent);
        res.end();
    } else if (req.method === 'POST' && req.url === '/submit') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const formData = qs.parse(body);
            // It's used to parse URL-encoded query strings or request bodies into JavaScript objects.
            const excludedFields = ['submit', 'submitbtn'];
             // This line initializes an array named excludedFields containing the names of fields 
            // that should be excluded from the form data. These are typically 
            // form submission buttons or other elements that are not relevant for processing the form data.
            for (const field of excludedFields) {
                delete formData[field];
            }         
            formData.userId = uuidv4();
            jsonData.push(formData);
            fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
                if (writeErr) {
                    console.error('Error writing JSON file:', writeErr);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.write('Internal Server Error');
                    res.end();
                    return;
                }
                console.log('Form data appended to ' + jsonFilePath);
                res.writeHead(302, { 'Location': '/table' });
                res.end();
            });
        });
    } else if (req.method === 'GET' && parsedUrl.pathname === '/table') {
        const template = fs.readFileSync('./home.ejs', 'utf-8');
        const rendered = ejs.render(template, { users: jsonData });
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(rendered);
        res.end();
    } else if (req.method === 'DELETE' && parsedUrl.pathname === '/deleteUser') {
        const userIdToDelete = parsedUrl.query.userId;
        const userIndex = jsonData.findIndex((user) => user.userId === userIdToDelete);
        if (userIndex !== -1) {
            const deletedUser = jsonData.splice(userIndex, 1)[0];
            fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
                if (writeErr) {
                    console.error('Error writing JSON file:', writeErr);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.write('Internal Server Error');
                    res.end();
                    return;
                }
                console.log('User deleted:', userIdToDelete);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.write(JSON.stringify({ success: true }));
                res.end();
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.write(JSON.stringify({ success: false, error: 'User not found' }));
            res.end();
        }
    }else if (req.method === 'GET' && parsedUrl.pathname === '/editUser') {
        const userIdToEdit = parsedUrl.query.userId;
        fs.readFile('./edit.html', 'utf-8', (err, editFormPage) => {
            if (err) {
                console.error('Error reading edit form file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.write('Internal Server Error');
                res.end();
                return;
            }
            fs.readFile(jsonFilePath, 'utf-8', (readErr, data) => {
                if (readErr) {
                    console.error('Error reading JSON file:', readErr);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.write('Internal Server Error');
                    res.end();
                    return;
                }

                try {
                    const jsonData = JSON.parse(data);
                    const userToEdit = jsonData.find((user) => user.userId === userIdToEdit);

                    if (!userToEdit) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.write('404 Not Found');
                        res.end();
                        return;
                    }

                    const modifiedEditPage = editFormPage
                    .replace('id="editUserId"', `id="editUserId" value="${userToEdit.userId}"`)
                    .replace('id="editName"',`id="editName" value="${userToEdit.name}"`)
                    .replace('id="editEmail"',`id="editEmail" value="${userToEdit.email}" `)
                    .replace('id="editPhone"',`id="editPhone" value="${userToEdit.phone}"`)
                    .replace('id="editPassword"',`id="editPassword" value="${userToEdit.password}"`)

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.write(modifiedEditPage);
                    res.end();
                } catch (parseError) {
                    console.error('Error parsing JSON data:', parseError);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.write('Internal Server Error');
                    res.end();
                }
            });
        });
    } else if (req.method === 'POST' && req.url === '/updateUser') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });
        req.on('end', () => {
            const formData = qs.parse(body);
            const userIdToUpdate = formData.userId;
            const userToEditIndex = jsonData.findIndex((user) => user.userId === userIdToUpdate);
            if (userToEditIndex !== -1) {
                jsonData[userToEditIndex].name = formData.name;
                jsonData[userToEditIndex].email = formData.email;
                jsonData[userToEditIndex].phone = formData.phone;
                jsonData[userToEditIndex].password = formData.password;
                fs.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing JSON file:', writeErr);
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.write('Internal Server Error');
                        res.end();
                        return;
                    }
                    console.log('User details updated:', userIdToUpdate);
                    res.writeHead(302, { 'Location': '/table' });
                    res.end();
                });
            } else {
                console.log('User not found for ID:', userIdToUpdate);
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.write(JSON.stringify({ success: false, error: 'User not found' }));
                res.end();
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.write('404 Not Found');
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
