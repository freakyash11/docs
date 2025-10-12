import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

  // Fetch user's documents
  const fetchDocuments = async () => {
    try {
      const token = await getToken({ leewayInSeconds: 10 });
      const response = await fetch(`${backendUrl}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create new document
  const createDocument = async () => {
    if (creating) return;
    
    setCreating(true);
    try {
      const token = await getToken();
      const response = await fetch(`${backendUrl}/api/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Untitled Document'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const newDoc = await response.json();
      navigate(`/documents/${newDoc.id}`);
    } catch (error) {
      setError(error.message);
      setCreating(false);
    }
  };

  // Delete document
  const deleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${backendUrl}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      setDocuments(documents.filter(doc => doc.id !== docId));
    } catch (error) {
      setError(error.message);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 text-lg">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
        <button
          onClick={createDocument}
          disabled={creating}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
        >
          {creating ? 'Creating...' : '+ New Document'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No documents yet</h3>
          <p className="text-gray-500 mb-6">Create your first document to get started</p>
          <button
            onClick={createDocument}
            disabled={creating}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed font-medium transition-colors shadow-md"
          >
            {creating ? 'Creating...' : '+ Create First Document'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
            >
              <div className="mb-4">
                <h3 
                  className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors line-clamp-2"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                >
                  {doc.title}
                </h3>
                
                <div className="text-sm text-gray-600 space-y-1.5">
                  <p className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Owner: {doc.owner}</span>
                    {doc.isOwner && <span className="text-blue-600 font-medium ml-1">(You)</span>}
                  </p>
                  <p className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Updated: {formatDate(doc.updatedAt)}</span>
                  </p>
                  <p className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Collaborators: {doc.collaborators}</span>
                  </p>
                </div>

                {doc.isPublic && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                      </svg>
                      Public
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/documents/${doc.id}`);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  Open
                </button>
                
                {doc.isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument(doc.id);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}