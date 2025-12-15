import { useState } from 'react';
import { Download, Image, X, Plus, Link, Trash2, ExternalLink } from 'lucide-react';

export default function TwitterMediaDownloader() {
  const [urls, setUrls] = useState(['']);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const updateUrl = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const extractTweetId = (url) => {
    const patterns = [
      /twitter\.com\/\w+\/status\/(\d+)/,
      /x\.com\/\w+\/status\/(\d+)/,
      /\/status\/(\d+)/,
      /^(\d+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const extractAndDownload = async () => {
    setError('');
    setMedia([]);
    setLoading(true);
    setProcessingStatus('Processing tweets...');

    const validUrls = urls.filter(url => url.trim() !== '');

    if (validUrls.length === 0) {
      setError('Please enter at least one tweet URL.');
      setLoading(false);
      return;
    }

    const allMedia = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i];
      const tweetId = extractTweetId(url);

      if (!tweetId) {
        failCount++;
        continue;
      }

      setProcessingStatus(`Processing tweet ${i + 1}/${validUrls.length}`);

      try {
        const response = await fetch(`https://api.vxtwitter.com/Twitter/status/${tweetId}`);
        const data = await response.json();

        if (data.media_extended) {
          const mediaItems = data.media_extended.map(m => {
            if (m.type === 'image') {
              return {
                type: 'image',
                url: m.url,
                original: m.url.replace(/&name=\w+/, '&name=orig'),
                tweetId: tweetId
              };
            } else if (m.type === 'video' || m.type === 'gif') {
              return {
                type: 'video',
                url: m.url,
                thumbnail: m.thumbnail_url,
                tweetId: tweetId
              };
            }
            return null;
          }).filter(Boolean);

          allMedia.push(...mediaItems);
          successCount++;
        }
      } catch (err) {
        failCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (allMedia.length === 0) {
      setError(`No media found. Success: ${successCount}, Failed: ${failCount}`);
      setProcessingStatus('');
      setLoading(false);
      return;
    }

    setMedia(allMedia);
    setProcessingStatus('');

    // Auto-download after extraction
    if (allMedia.length > 0) {
      setProcessingStatus('Downloading media...');
      for (let i = 0; i < allMedia.length; i++) {
        setProcessingStatus(`Downloading ${i + 1}/${allMedia.length}`);
        await downloadSingle(allMedia[i], i);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      setProcessingStatus('');
    }

    setLoading(false);
  };

  const downloadSingle = async (item, index) => {
    try {
      const downloadUrl = item.type === 'image' ? item.original : item.url;
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = item.type === 'image' ? 'jpg' : 'mp4';
      a.download = `twitter-${item.type}-${index + 1}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const resetAll = () => {
    setUrls(['']);
    setMedia([]);
    setError('');
    setProcessingStatus('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main Card */}
        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <Image className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Twitter Media Downloader</h1>
            <p className="text-gray-400">Extract and download images & videos from tweets</p>
          </div>

          {/* URL Input Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-300">
                <Link className="w-5 h-5" />
                <span className="font-medium">Tweet URLs</span>
                <span className="text-sm text-gray-500">({urls.length})</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addUrlField}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add URL
                </button>
                {media.length > 0 && (
                  <button
                    onClick={resetAll}
                    className="flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Reset All
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {urls.map((url, index) => (
                <div key={index} className="flex gap-2 group">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => updateUrl(index, e.target.value)}
                      placeholder="https://twitter.com/username/status/..."
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-300 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    />
                    {url && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <ExternalLink className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                  {urls.length > 1 && (
                    <button
                      onClick={() => removeUrlField(index)}
                      className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400 rounded-xl transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Action Button */}
          <button
            onClick={extractAndDownload}
            disabled={loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg mb-6"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{processingStatus || 'Processing...'}</span>
              </div>
            ) : (
              'Extract & Download All'
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Results Section */}
          {media.length > 0 && (
            <div className="animate-fadeIn">
              {/* Results Summary */}
              <div className="mb-6 p-5 bg-gray-900/50 border border-gray-700/50 rounded-xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-xl font-bold text-white">
                      {media.length} Media Items Ready
                    </p>
                    <p className="text-gray-400 mt-1">
                      All items have been downloaded automatically
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-300">{media.filter(m => m.type === 'image').length} Images</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-300">{media.filter(m => m.type === 'video').length} Videos</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Grid */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Downloaded Media Preview</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {media.map((item, index) => (
                    <div
                      key={index}
                      className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-600 transition-all hover:shadow-lg"
                    >
                      {item.type === 'image' ? (
                        <img
                          src={item.url}
                          alt={`Image ${index + 1}`}
                          className="w-full h-36 object-cover"
                        />
                      ) : (
                        <div className="relative w-full h-36 bg-gray-800">
                          <img
                            src={item.thumbnail}
                            alt={`Video ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full p-3 shadow-lg">
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                              </svg>
                            </div>
                          </div>
                          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-white">
                            VIDEO
                          </div>
                        </div>
                      )}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            {item.type}
                          </span>
                          <span className="text-xs text-gray-500">#{index + 1}</span>
                        </div>
                        <button
                          onClick={() => downloadSingle(item, index)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download Again
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset Prompt */}
              <div className="text-center pt-4 border-t border-gray-700/50">
                <p className="text-gray-500 text-sm">
                  Enter new URLs to extract more media, or{' '}
                  <button
                    onClick={resetAll}
                    className="text-red-400 hover:text-red-300 underline transition-colors"
                  >
                    reset everything
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Instructions when no media */}
          {media.length === 0 && !loading && !error && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-700/50 rounded-full mb-4">
                <Download className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-500 text-sm">
                Enter tweet URLs above and click "Extract & Download All"
              </p>
              <p className="text-gray-600 text-xs mt-2">
                Supports Twitter.com and X.com URLs
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            Works with Twitter/X public posts • Downloads media automatically
          </p>
        </div>
      </div>
    </div>
  );
}