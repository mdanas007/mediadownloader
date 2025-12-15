
import { useState } from 'react';
import { Download, Image, X, Plus, Link } from 'lucide-react';

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

    const extractAllMedia = async () => {
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
        } else {
            setMedia(allMedia);
        }

        setProcessingStatus('');
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

    const downloadAll = async () => {
        setLoading(true);
        setProcessingStatus('Downloading media...');

        for (let i = 0; i < media.length; i++) {
            setProcessingStatus(`Downloading ${i + 1}/${media.length}`);
            await downloadSingle(media[i], i);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        setProcessingStatus('');
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-900 p-4">
            <div className="max-w-6xl mx-auto">
                <div className="bg-gray-800 rounded-lg p-6 mt-6 border border-gray-700">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Image className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Twitter Media Downloader</h1>
                            <p className="text-gray-400 text-sm">Extract images and videos from multiple tweets</p>
                        </div>
                    </div>

                    {/* URL Input Fields */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-gray-300">
                                <Link className="w-4 h-4" />
                                <span className="text-sm font-medium">Tweet URLs</span>
                            </div>
                            <button
                                onClick={addUrlField}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>

                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {urls.map((url, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => updateUrl(index, e.target.value)}
                                        placeholder="https://twitter.com/username/status/... or https://x.com/username/status/..."
                                        className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-md text-gray-300 placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                                    />
                                    {urls.length > 1 && (
                                        <button
                                            onClick={() => removeUrlField(index)}
                                            className="px-4 py-2.5 bg-gray-700 text-gray-400 rounded-md hover:bg-gray-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Extract Button */}
                    <button
                        onClick={extractAllMedia}
                        disabled={loading}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed mb-6"
                    >
                        {loading ? (processingStatus || 'Processing...') : 'Extract Media'}
                    </button>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-900 bg-opacity-20 border border-red-700 rounded-md mb-6">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Results Summary */}
                    {media.length > 0 && (
                        <div className="mb-6 p-4 bg-gray-900 border border-gray-700 rounded-md">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <p className="text-white font-medium">
                                        {media.length} media items found
                                        <span className="text-gray-400 ml-2">
                                            ({media.filter(m => m.type === 'image').length} images, {media.filter(m => m.type === 'video').length} videos)
                                        </span>
                                    </p>
                                    <p className="text-gray-400 text-sm">Click individual items to download</p>
                                </div>
                                <button
                                    onClick={downloadAll}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed"
                                >
                                    <Download className="w-4 h-4" />
                                    Download All
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Media Grid */}
                    {media.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {media.map((item, index) => (
                                <div key={index} className="bg-gray-900 border border-gray-700 rounded-md overflow-hidden hover:border-gray-600 transition-colors">
                                    {item.type === 'image' ? (
                                        <img
                                            src={item.url}
                                            alt={`Image ${index + 1}`}
                                            className="w-full h-40 object-cover"
                                        />
                                    ) : (
                                        <div className="relative w-full h-40 bg-gray-800">
                                            <img
                                                src={item.thumbnail}
                                                alt={`Video ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                                                <div className="bg-blue-600 rounded-full p-3">
                                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="absolute top-2 right-2 bg-black bg-opacity-70 px-2 py-1 rounded text-xs text-white">
                                                VIDEO
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-3">
                                        <button
                                            onClick={() => downloadSingle(item, index)}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-md hover:bg-gray-700"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download {item.type === 'video' ? 'Video' : 'Image'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


