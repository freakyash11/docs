import { useState, useEffect, useCallback } from 'react';
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

  const fetchDocuments = useCallback(async () => {
    try {
      const token = await getToken({ leewayInSeconds: 10 });
      const response = await fetch(`${backendUrl}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      const data = await response.json();
      setDocuments(data.documents);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, getToken]);

  const createDocument = useCallback(async () => {
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
  }, [creating, backendUrl, getToken, navigate]);

  const deleteDocument = useCallback(async (docId) => {
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
  }, [documents, backendUrl, getToken]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-docsy-blue"></div>
              <p className="mt-4 text-base text-muted-text">Loading your documents...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-bg font-['Inter',system-ui,-apple-system,sans-serif]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold mb-2 text-slate-ink">
              My Documents
            </h1>
            <p className="text-base text-muted-text">
              {documents.length === 0 ? 'Start creating your first document' : `${documents.length} ${documents.length === 1 ? 'document' : 'documents'}`}
            </p>
          </div>
          <button
            onClick={createDocument}
            disabled={creating}
            className="px-6 py-3 bg-docsy-blue hover:bg-[#2E6FD9] text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            style={{ boxShadow: '0 2px 8px rgba(58, 134, 255, 0.15)' }}
          >
            {creating ? (
              <span className="flex items-center gap-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Document
              </span>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 rounded-2xl border bg-red-50 border-red-300">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-red-600">Error</p>
                <p className="text-sm mt-1 text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 sm:p-16 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className="max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-light-bg rounded-full mb-6">
                <svg className="w-10 h-10 text-docsy-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-slate-ink">
                No documents yet
              </h3>
              <p className="text-base mb-8 text-muted-text">
                Create your first document and start collaborating with your team
              </p>
              <button
                onClick={createDocument}
                disabled={creating}
                className="px-8 py-3 bg-docsy-blue hover:bg-[#2E6FD9] text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '0 2px 8px rgba(58, 134, 255, 0.15)' }}
              >
                {creating ? 'Creating...' : 'Create First Document'}
              </button>
            </div>
          </div>
        ) : (
          /* Documents Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer group shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
              >
                {/* Card Header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 
                      className="text-lg font-semibold text-slate-ink leading-tight flex-1 line-clamp-2 group-hover:text-docsy-blue transition-colors"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      {doc.title}
                    </h3>
                    {doc.isPublic && (
                      <span className="inline-flex items-center gap-1 bg-soft-green text-green-900 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Public
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-6 py-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 flex-shrink-0 text-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm text-muted-text">
                        {doc.owner}
                        {doc.isOwner && (
                          <span className="ml-1.5 font-medium text-docsy-blue">
                            (You)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 flex-shrink-0 text-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-muted-text">
                        Updated {formatDate(doc.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 flex-shrink-0 text-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="text-sm text-muted-text">
                        {doc.collaborators} {doc.collaborators === 1 ? 'collaborator' : 'collaborators'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 pb-6">
                  <div className="flex gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/documents/${doc.id}`);
                      }}
                      className="flex-1 px-4 py-2.5 bg-docsy-blue hover:bg-[#2E6FD9] text-white rounded-xl text-sm font-medium transition-all duration-200"
                    >
                      Open
                    </button>
                    
                    {doc.isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDocument(doc.id);
                        }}
                        className="px-4 py-2.5 bg-coral-red hover:bg-[#E54449] text-white rounded-xl text-sm font-medium transition-all duration-200"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}