// Dashboard Logic
let currentUser = null;
let editModal = null;
const { showAlert, formatDate } = window;

// Initialize dashboard
async function initDashboard() {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = session.user;
    document.getElementById('userEmail').textContent = currentUser.email;
    
    // Initialize Bootstrap modal
    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    
    // Load documents
    await loadDocuments();
}

// Load all documents
async function loadDocuments(searchQuery = '') {
    const tableBody = document.getElementById('documentsTable');
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border"></div></td></tr>';
    
    try {
        let query = supabase
            .from('documents')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('uploaded_at', { ascending: false });
        
        // Apply search filter if provided
        if (searchQuery) {
            query = query.ilike('title', `%${searchQuery}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Display documents
        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="bi bi-inbox" style="font-size: 2rem;"></i>
                        <p class="mt-2">No documents found. Upload your first document!</p>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = data.map(doc => `
                <tr>
                    <td><strong>${escapeHtml(doc.title)}</strong></td>
                    <td>${escapeHtml(doc.description || 'N/A')}</td>
                    <td>${formatDate(doc.uploaded_at)}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary" onclick="viewDocument('${doc.file_path}')" title="View">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-outline-success" onclick="downloadDocument('${doc.file_path}', '${escapeHtml(doc.title)}')" title="Download">
                                <i class="bi bi-download"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="openEditModal('${doc.id}', '${escapeHtml(doc.title)}', '${escapeHtml(doc.description || '')}')" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteDocument('${doc.id}', '${doc.file_path}')" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
        
    } catch (error) {
        console.error('Error loading documents:', error);
        showAlert('Failed to load documents: ' + error.message, 'danger');
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading documents</td></tr>';
    }
}

// Upload document
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!e.target.checkValidity()) {
        e.target.classList.add('was-validated');
        return;
    }
    
    const title = document.getElementById('documentTitle').value;
    const description = document.getElementById('documentDescription').value;
    const fileInput = document.getElementById('documentFile');
    const file = fileInput.files[0];
    
    if (!file || file.type !== 'application/pdf') {
        showAlert('Please select a valid PDF file', 'danger');
        return;
    }
    
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadSpinner = document.getElementById('uploadSpinner');
    
    try {
        uploadBtn.disabled = true;
        uploadSpinner.classList.remove('d-none');
        
        // Upload file to Supabase Storage
        const fileName = `${currentUser.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        // Insert document metadata into database
        const { data: insertData, error: insertError } = await supabase
            .from('documents')
            .insert([{
                title: title,
                description: description || null,
                file_path: fileName,
                user_id: currentUser.id
            }]);
        
        if (insertError) throw insertError;
        
        showAlert('Document uploaded successfully!', 'success');
        
        // Reset form
        document.getElementById('uploadForm').reset();
        e.target.classList.remove('was-validated');
        
        // Reload documents
        await loadDocuments();
        
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('Failed to upload document: ' + error.message, 'danger');
    } finally {
        uploadBtn.disabled = false;
        uploadSpinner.classList.add('d-none');
    }
});

// View document
async function viewDocument(filePath) {
    try {
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (error) throw error;
        
        window.open(data.signedUrl, '_blank');
    } catch (error) {
        console.error('View error:', error);
        showAlert('Failed to view document: ' + error.message, 'danger');
    }
}

// Download document
async function downloadDocument(filePath, title) {
    try {
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .download(filePath);
        
        if (error) throw error;
        
        // Create download link
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showAlert('Document downloaded successfully!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showAlert('Failed to download document: ' + error.message, 'danger');
    }
}

// Open edit modal
function openEditModal(id, title, description) {
    document.getElementById('editDocumentId').value = id;
    document.getElementById('editTitle').value = title;
    document.getElementById('editDescription').value = description;
    editModal.show();
}

// Save edited document
document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const id = document.getElementById('editDocumentId').value;
    const title = document.getElementById('editTitle').value;
    const description = document.getElementById('editDescription').value;
    
    if (!title.trim()) {
        showAlert('Title is required', 'danger');
        return;
    }
    
    const saveBtn = document.getElementById('saveEditBtn');
    const editSpinner = document.getElementById('editSpinner');
    
    try {
        saveBtn.disabled = true;
        editSpinner.classList.remove('d-none');
        
        const { error } = await supabase
            .from('documents')
            .update({
                title: title,
                description: description || null
            })
            .eq('id', id)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        showAlert('Document updated successfully!', 'success');
        editModal.hide();
        await loadDocuments();
        
    } catch (error) {
        console.error('Update error:', error);
        showAlert('Failed to update document: ' + error.message, 'danger');
    } finally {
        saveBtn.disabled = false;
        editSpinner.classList.add('d-none');
    }
});

// Delete document
async function deleteDocument(id, filePath) {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([filePath]);
        
        if (storageError) throw storageError;
        
        // Delete from database
        const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id);
        
        if (dbError) throw dbError;
        
        showAlert('Document deleted successfully!', 'success');
        await loadDocuments();
        
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('Failed to delete document: ' + error.message, 'danger');
    }
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchQuery = e.target.value.trim();
    loadDocuments(searchQuery);
});

// Refresh button
document.getElementById('refreshBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    loadDocuments();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showAlert('Failed to logout: ' + error.message, 'danger');
    }
});

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize on page load
initDashboard();