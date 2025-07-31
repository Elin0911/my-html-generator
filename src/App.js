import React, { useState, useRef, useEffect, useCallback } from 'react';

// Helper function to convert base64 to ArrayBuffer (for file operations)
const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

// Helper function to convert ArrayBuffer to base64 (for file operations)
const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};


function App() {
    // State for input fields
    const [mainCategoryName, setMainCategoryName] = useState('');
    const [mainCategoryUrl, setMainCategoryUrl] = useState('');
    const [subCategoryName, setSubCategoryName] = useState('');
    const [subCategoryUrl, setSubCategoryUrl] = useState('');
    const [titleText, setTitleText] = useState('');
    // State for the rich text editor content (HTML string)
    const [editorContent, setEditorContent] = useState('');
    // State for the generated HTML output
    const [generatedHtml, setGeneratedHtml] = useState('');
    // State for showing custom message box (for general messages)
    const [message, setMessage] = useState('');
    const [showMessageBox, setShowMessageBox] = useState(false);
    // State for scroll to top button visibility
    const [showScrollToTopButton, setShowScrollToTopButton] = useState(false);


    // States for the custom input modal (for image/link URLs/captions)
    const [showInputModal, setShowInputModal] = useState(false);
    const [inputModalTitle, setInputModalTitle] = useState('');
    const [inputModalLabel1, setInputModalLabel1] = useState('');
    const [inputModalPlaceholder1, setInputModalPlaceholder1] = useState('');
    const [inputModalLabel2, setInputModalLabel2] = useState('');
    const [inputModalPlaceholder2, setInputModalPlaceholder2] = useState('');
    const [tempInput1, setTempInput1] = useState(''); // Value for first input in modal
    const [tempInput2, setTempInput2] = useState(''); // Value for second input in modal
    const inputModalCallback = useRef(null); // Callback function to execute on modal confirm

    // Ref for the content editable div
    const editorRef = useRef(null);
    // Ref to store the current selection/range for contentEditable
    const savedRange = useRef(null);

    // Function to show custom message box
    const showMessage = (msg) => {
        setMessage(msg);
        setShowMessageBox(true);
    };

    // Function to hide custom message box
    const hideMessageBox = () => {
        setShowMessageBox(false);
        setMessage('');
    };

    // Function to apply text formatting
    const applyFormat = (command, value = null) => {
        // Restore selection if available, otherwise use current selection
        if (savedRange.current) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRange.current);
        }
        document.execCommand(command, false, value);
        // After DOM manipulation, update React state and restore focus
        if (editorRef.current) {
            setEditorContent(editorRef.current.innerHTML);
            editorRef.current.focus(); // Ensure editor regains focus
        }
        // Clear saved range after applying format
        savedRange.current = null;
    };

    // Save current selection when editor loses focus or a button is clicked
    const saveSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRange.current = selection.getRangeAt(0);
        }
    }, []);

    // Handle blur event for the editor to sync content to state
    const handleEditorBlur = () => {
        if (editorRef.current) {
            setEditorContent(editorRef.current.innerHTML);
        }
    };

    // Handle paste event to strip HTML/CSS formatting
    const handlePaste = (event) => {
        event.preventDefault(); // Prevent default paste behavior
        const text = event.clipboardData.getData('text/plain'); // Get plain text from clipboard
        document.execCommand('insertText', false, text); // Insert plain text at cursor
        if (editorRef.current) {
            setEditorContent(editorRef.current.innerHTML); // Update state with new content
        }
    };

    // Handle keydown events for the editor, specifically for 'Enter' key
    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default browser behavior

            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);

            // Insert a <br> tag for a simple line break
            const br = document.createElement('br');
            range.deleteContents(); // Delete any selected text
            range.insertNode(br); // Insert <br> at cursor position

            // Create a new range *after* the inserted <br>
            const newRange = document.createRange();
            newRange.setStartAfter(br);
            newRange.setEndAfter(br);

            // Set the new range as the current selection
            selection.removeAllRanges();
            selection.addRange(newRange);

            // Update the state with the new content after manual DOM manipulation
            if (editorRef.current) {
                setEditorContent(editorRef.current.innerHTML);
            }
        }
    };

    // Open the custom input modal
    const openInputModal = (title, label1, placeholder1, label2, placeholder2, callback) => {
        setInputModalTitle(title);
        setInputModalLabel1(label1);
        setInputModalPlaceholder1(placeholder1);
        setInputModalLabel2(label2);
        setInputModalPlaceholder2(placeholder2);
        setTempInput1('');
        setTempInput2('');
        inputModalCallback.current = callback;
        setShowInputModal(true);
    };

    // Close the custom input modal
    const closeInputModal = () => {
        setShowInputModal(false);
        setTempInput1('');
        setTempInput2('');
        inputModalCallback.current = null;
        if (editorRef.current) {
            editorRef.current.focus(); // Return focus to editor after modal closes
        }
    };

    // Handle confirmation from the custom input modal
    const handleInputModalConfirm = () => {
        if (inputModalCallback.current) {
            inputModalCallback.current(tempInput1, tempInput2);
        }
        closeInputModal();
    };

    // Function to insert an image (now uses custom modal)
    const insertImage = () => {
        saveSelection(); // Save selection before opening modal
        openInputModal(
            '插入圖片',
            '圖片網址:',
            '例如：https://example.com/image.jpg',
            '圖片說明 (可選):',
            '例如：美麗的風景',
            (imageUrl, imageCaption) => {
                if (imageUrl) {
                    // Prepend "▲ " to the caption if it exists
                    const formattedCaption = imageCaption ? '▲ ' + imageCaption : '';
                    const imgHtml = `<figure><img src="${imageUrl}" alt="${imageCaption || '圖片'}" /><figcaption>${formattedCaption}</figcaption></figure>`;
                    insertHtmlAtCursor(imgHtml, true); // Pass true to indicate image insertion
                }
            }
        );
    };

    // Function to insert a hyperlink (now uses custom modal)
    const insertLink = () => {
        saveSelection(); // Save selection before opening modal
        openInputModal(
            '插入超連結',
            '連結網址:',
            '例如：https://google.com',
            '連結文字 (可選，如果沒有選擇文字):',
            '例如：點擊這裡',
            (linkUrl, modalLinkText) => {
                if (linkUrl) {
                    let actualLinkText = modalLinkText;

                    // If modalLinkText is empty, try to use selected text from the editor
                    if (!actualLinkText && savedRange.current && !savedRange.current.collapsed) {
                        actualLinkText = savedRange.current.toString();
                    }

                    // If still empty, use the URL as the display text
                    if (!actualLinkText) {
                        actualLinkText = linkUrl;
                    }

                    // Construct the full <a> tag HTML with target="_blank" and rel for security
                    const aTagHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${actualLinkText}</a>`;
                    insertHtmlAtCursor(aTagHtml);
                }
            }
        );
    };

    // Helper to insert HTML at the current cursor position
    const insertHtmlAtCursor = (html, isImage = false) => {
        if (savedRange.current) {
            const range = savedRange.current;
            range.deleteContents(); // Delete selected content

            // Create a temporary div to parse the HTML string
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const fragment = document.createDocumentFragment();
            let insertedMainNode = null; // To hold the main node inserted (e.g., <figure> or <a>)

            // Append all children from tempDiv to fragment
            while (tempDiv.firstChild) {
                const child = tempDiv.firstChild;
                if (!insertedMainNode) { // Capture the first main node inserted
                    insertedMainNode = child;
                }
                fragment.appendChild(child);
            }

            range.insertNode(fragment); // Insert the fragment into the DOM

            const selection = window.getSelection();
            const newRange = document.createRange();

            if (isImage && insertedMainNode && insertedMainNode.nodeName === 'FIGURE') {
                // For images, explicitly insert a new paragraph AFTER the figure
                const newParagraph = document.createElement('p');
                newParagraph.innerHTML = '&nbsp;'; // Ensure it's not empty for cursor placement

                // Find the parent of the inserted figure and insert the new paragraph after it
                if (insertedMainNode.parentNode) {
                    insertedMainNode.parentNode.insertBefore(newParagraph, insertedMainNode.nextSibling);
                } else {
                    // Fallback if insertedMainNode somehow doesn't have a parent immediately
                    // This case should ideally not happen if range.insertNode worked
                    editorRef.current.appendChild(newParagraph);
                }

                newRange.setStart(newParagraph, 0);
                newRange.setEnd(newParagraph, 0);
            } else if (fragment.lastChild) {
                // For other insertions (like links), place cursor after the last inserted content
                newRange.setStartAfter(fragment.lastChild);
                newRange.setEndAfter(fragment.lastChild);
            } else {
                // Fallback for empty fragment or unexpected scenarios
                newRange.setStart(editorRef.current, editorRef.current.childNodes.length);
                newRange.setEnd(editorRef.current, editorRef.current.childNodes.length);
            }

            selection.removeAllRanges();
            selection.addRange(newRange);

        } else {
            // Fallback if no specific range is saved (e.g., editor is focused)
            // This path is less controlled for cursor placement, but should be rare
            // for image/link insertions since saveSelection() is called.
            document.execCommand('insertHTML', false, html);
        }
        // Update the state with the new content
        if (editorRef.current) {
            setEditorContent(editorRef.current.innerHTML);
            editorRef.current.focus(); // Ensure editor regains focus
        }
        savedRange.current = null; // Clear saved range after insertion
    };

    // Function to clear all text formatting
    const clearFormatting = () => {
        applyFormat('removeFormat');
    };

    // Function to clear all fields and output
    const clearAllContent = () => {
        setMainCategoryName('');
        setMainCategoryUrl('');
        setSubCategoryName('');
        setSubCategoryUrl('');
        setTitleText('');
        setEditorContent('');
        if (editorRef.current) {
            editorRef.current.innerHTML = ''; // Clear the actual contentEditable div
        }
        setGeneratedHtml('');
        showMessage('所有內容已清空！');
    };

    // Function to copy generated HTML to clipboard
    const copyToClipboard = () => {
        if (generatedHtml) {
            // Use a temporary textarea to copy the text
            const textarea = document.createElement('textarea');
            textarea.value = generatedHtml;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showMessage('HTML + CSS 程式碼已複製到剪貼簿！');
        } else {
            showMessage('沒有可複製的程式碼。請先產生 HTML。');
        }
    };

    // Function to scroll to the top of the page
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // Smooth scrolling
        });
    };

    // Effect to handle scroll event for showing/hiding scroll to top button
    useEffect(() => {
        const handleScroll = () => {
            if (window.pageYOffset > 300) { // Show button after scrolling 300px down
                setShowScrollToTopButton(true);
            } else {
                setShowScrollToTopButton(false);
            }
        };

        window.addEventListener('scroll', handleScroll);

        // Clean up the event listener when the component unmounts
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount


    // Generate HTML and CSS
    const generateHtmlCss = () => {
        const styleContent = `
        body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f3f4f6; /* Tailwind gray-100 */
            color: #1f2937; /* Tailwind gray-800 */
            line-height: 1.6;
        }
        .container {
            max-width: 800px; /* 畫面寬度為800 */
            margin: 0 auto;
            padding: 1rem; /* p-4 */
            background-color: #ffffff; /* bg-white */
            /* box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* Removed shadow for no side borders */
            border-radius: 0.5rem; /* rounded-lg */
        }
        .category-wrapper {
            margin-bottom: 0.5rem; /* mb-2 */
            text-align: left; /* Default alignment */
        }
        .category-wrapper a {
            color: #3b82f6; /* Tailwind blue-500 */
            text-decoration: none;
            transition: color 0.2s ease-in-out;
        }
        .category-wrapper a:hover {
            color: #2563eb; /* Tailwind blue-600 */
        }
        .cat-part-main {
            font-size: 1.25rem; /* text-xl */
            font-weight: 700; /* font-bold */
            color: #1f2937; /* Tailwind gray-800 */
            display: inline; /* Ensure it stays inline */
        }
        .cat-part-sub {
            font-size: 1rem; /* text-base */
            font-weight: 600; /* font-semibold */
            color: #4b5563; /* Tailwind gray-600 */
            display: inline; /* Ensure it stays inline */
        }
        .title {
            font-size: 2.25rem; /* text-4xl */
            font-weight: 700; /* font-bold */
            margin-bottom: 1rem; /* mb-4 */
            color: #1f2937; /* Tailwind gray-800 */
        }
        .content {
            font-size: 1rem; /* text-base */
            line-height: 1.75; /* leading-relaxed */
        }
        .content p {
            margin-bottom: 1rem;
        }
        .content strong, .content b {
            font-weight: 700; /* font-bold */
        }
        .content em, .content i {
            font-style: italic;
        }
        .content u {
            text-decoration: underline;
        }
        .content img {
            max-width: 100%; /* Ensure images are responsive within their container */
            max-height: 600px; /* 圖寬MAX600 */
            height: auto;
            display: block; /* Make image a block element for margin: auto to work */
            margin: 1rem auto; /* Center images and add vertical margin */
            border-radius: 0.5rem; /* rounded-lg */
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); /* shadow-sm */
        }
        .content figure {
            margin: 1rem 0; /* Add margin for figures */
            text-align: center; /* Center content within figure, including figcaption */
        }
        .content figcaption {
            font-size: 0.875rem; /* text-sm, smaller font for caption */
            color: #6b7280; /* Tailwind gray-500 */
            margin-top: 0.5rem; /* mt-2 */
            text-align: center; /* Ensure caption is centered */
        }
        .content a {
            color: #3b82f6; /* Tailwind blue-500 */
            text-decoration: underline;
        }

        /* Responsive adjustments for tablets and mobile phones */
        @media (max-width: 768px) { /* md breakpoint */
            .container {
                padding: 0.75rem; /* p-3 */
            }
            .title {
                font-size: 1.75rem; /* text-3xl */
            }
            .cat-part-main {
                font-size: 1.125rem; /* text-lg */
            }
            .cat-part-sub {
                font-size: 0.875rem; /* text-sm */
            }
        }
        @media (max-width: 640px) { /* sm breakpoint */
            .container {
                padding: 0.5rem; /* p-2 */
            }
            .title {
                font-size: 1.5rem; /* text-2xl */
            }
            .cat-part-main {
                font-size: 1rem; /* text-base */
            }
            .cat-part-sub {
                font-size: 0.75rem; /* text-xs */
            }
        }
    `;

        let categoryDisplayHtml = '';
        const mainCatElement = mainCategoryName ? `<span class="cat-part-main">${mainCategoryUrl ? `<a href="${mainCategoryUrl}" target="_blank" rel="noopener noreferrer">${mainCategoryName}</a>` : mainCategoryName}</span>` : '';
        const subCatElement = subCategoryName ? `<span class="cat-part-sub">${subCategoryUrl ? `<a href="${subCategoryUrl}" target="_blank" rel="noopener noreferrer">${subCategoryName}</a>` : subCategoryName}</span>` : '';

        if (mainCatElement && subCatElement) {
            categoryDisplayHtml = `<div class="category-wrapper">${mainCatElement} &gt; ${subCatElement}</div>`;
        } else if (mainCatElement) {
            categoryDisplayHtml = `<div class="category-wrapper">${mainCatElement}</div>`;
        } else if (subCatElement) {
            categoryDisplayHtml = `<div class="category-wrapper">${subCatElement}</div>`;
        }


        const htmlContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titleText || '無標題文件'}</title>
</head>
<body>
    <div class="styles-container">
        <!-- 注意：將 <style> 標籤放在 <body> 內的 <div> 中，這不是 HTML 的標準做法，
             通常 <style> 標籤應放在 <head> 或直接放在 <body> 的開頭。
             這樣做可能會影響樣式載入和渲染行為，但根據您的要求已實作。 -->
        <style>
${styleContent}
        </style>
    </div>
    <div class="container">
        ${categoryDisplayHtml}
        <h1 class="title">${titleText || '無標題'}</h1>
        <div class="content">
            ${editorContent}
        </div>
    </div>
</body>
</html>`;
        setGeneratedHtml(htmlContent);
    };

    // Export settings to a JSON file
    const exportSettings = () => {
        const settings = {
            mainCategoryName,
            mainCategoryUrl,
            subCategoryName,
            subCategoryUrl,
            titleText,
            editorContent,
        };
        const jsonString = JSON.stringify(settings, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'html_generator_settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage('設定已匯出為 html_generator_settings.json');
    };

    // Load settings from a JSON file
    const importSettings = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const settings = JSON.parse(e.target.result);
                    setMainCategoryName(settings.mainCategoryName || '');
                    setMainCategoryUrl(settings.mainCategoryUrl || '');
                    setSubCategoryName(settings.subCategoryName || '');
                    setSubCategoryUrl(settings.subCategoryUrl || '');
                    setEditorContent(settings.editorContent || ''); // Update state
                    setTitleText(settings.titleText || '');
                    if (editorRef.current) {
                        editorRef.current.innerHTML = settings.editorContent || ''; // Set actual DOM content
                    }
                    showMessage('設定已成功匯入！');
                } catch (error) {
                    showMessage('載入設定失敗：無效的 JSON 檔案。');
                    console.error('Error parsing settings file:', error);
                }
            };
            reader.readAsText(file);
        }
    };

    // Set initial content of contentEditable div when editorContent state changes
    useEffect(() => {
        // This useEffect ensures that when editorContent is programmatically changed (e.g., by importSettings),
        // the contentEditable div's innerHTML is updated.
        // It should NOT run on every user input to avoid cursor jumps.
        if (editorRef.current && editorRef.current.innerHTML !== editorContent) {
            editorRef.current.innerHTML = editorContent;
            // When content is loaded/imported, cursor might be at start.
            // We don't try to restore cursor here as this is for external changes.
        }
    }, [editorContent]);

    return (
        <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center font-sans">
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

            {/* Custom Message Box (for general messages like export/import status) */}
            {showMessageBox && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                        <p className="text-lg mb-4">{message}</p>
                        <button
                            onClick={hideMessageBox}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                        >
                            確定
                        </button>
                    </div>
                </div>
            )}

            {/* Custom Input Modal (for Image/Link URLs/Captions) */}
            {showInputModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">{inputModalTitle}</h3>
                        <div className="mb-4">
                            <label htmlFor="input1" className="block text-gray-700 text-sm font-semibold mb-1">{inputModalLabel1}</label>
                            <input
                                type="text"
                                id="input1"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={tempInput1}
                                onChange={(e) => setTempInput1(e.target.value)}
                                placeholder={inputModalPlaceholder1}
                            />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="input2" className="block text-gray-700 text-sm font-semibold mb-1">{inputModalLabel2}</label>
                            <input
                                type="text"
                                id="input2"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={tempInput2}
                                onChange={(e) => setTempInput2(e.target.value)}
                                placeholder={inputModalPlaceholder2}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={closeInputModal}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleInputModalConfirm}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                            >
                                確定
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-lg mb-8">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">HTML 內容產生器</h1>

                {/* Input Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label htmlFor="mainCategoryName" className="block text-gray-700 text-sm font-semibold mb-1">主分類名稱 (純文字)</label>
                        <input
                            type="text"
                            id="mainCategoryName"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={mainCategoryName}
                            onChange={(e) => setMainCategoryName(e.target.value)}
                            placeholder="例如：科技"
                        />
                    </div>
                    <div>
                        <label htmlFor="mainCategoryUrl" className="block text-gray-700 text-sm font-semibold mb-1">主分類 URL (可選)</label>
                        <input
                            type="url"
                            id="mainCategoryUrl"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={mainCategoryUrl}
                            onChange={(e) => setMainCategoryUrl(e.target.value)}
                            placeholder="例如：https://example.com/tech"
                        />
                    </div>
                    <div>
                        <label htmlFor="subCategoryName" className="block text-gray-700 text-sm font-semibold mb-1">次分類名稱 (純文字)</label>
                        <input
                            type="text"
                            id="subCategoryName"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={subCategoryName}
                            onChange={(e) => setSubCategoryName(e.target.value)}
                            placeholder="例如：人工智慧"
                        />
                    </div>
                    <div>
                        <label htmlFor="subCategoryUrl" className="block text-gray-700 text-sm font-semibold mb-1">次分類 URL (可選)</label>
                        <input
                            type="url"
                            id="subCategoryUrl"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={subCategoryUrl}
                            onChange={(e) => setSubCategoryUrl(e.target.value)}
                            placeholder="例如：https://example.com/ai"
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label htmlFor="titleText" className="block text-gray-700 text-sm font-semibold mb-1">題目欄位 (純文字)</label>
                    <input
                        type="text"
                        id="titleText"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={titleText}
                        onChange={(e) => setTitleText(e.target.value)}
                        placeholder="例如：人工智慧的未來趨勢"
                    />
                </div>

                {/* Rich Text Editor */}
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-semibold mb-2">回答欄位 (所見即所得編輯器)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        <button
                            onClick={() => applyFormat('bold')}
                            onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
                            className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-800 transition duration-200"
                        >
                            粗體
                        </button>
                        <button
                            onClick={() => applyFormat('italic')}
                            onMouseDown={(e) => e.preventDefault()}
                            className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg italic text-gray-800 transition duration-200"
                        >
                            斜體
                        </button>
                        <button
                            onClick={() => applyFormat('underline')}
                            onMouseDown={(e) => e.preventDefault()}
                            className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg underline text-gray-800 transition duration-200"
                        >
                            底線
                        </button>
                        <input
                            type="color"
                            onInput={(e) => applyFormat('foreColor', e.target.value)}
                            onMouseDown={(e) => e.preventDefault()}
                            className="w-10 h-10 p-1 border border-gray-300 rounded-lg cursor-pointer"
                            title="文字顏色"
                        />
                        <button
                            onClick={insertImage}
                            onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
                            className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 transition duration-200"
                        >
                            插入圖片
                        </button>
                        <button
                            onClick={insertLink}
                            onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
                            className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 transition duration-200"
                        >
                            插入超連結
                        </button>
                        <button
                            onClick={clearFormatting}
                            onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
                            className="p-2 bg-red-400 hover:bg-red-500 text-white font-bold py-1 px-3 rounded-lg transition duration-200"
                        >
                            清除格式
                        </button>
                    </div>
                    <div
                        ref={editorRef}
                        contentEditable="true"
                        className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto"
                        onBlur={handleEditorBlur} // Sync state on blur
                        onPaste={handlePaste} // Add paste handler
                        onKeyDown={handleKeyDown} // Handle keydown events, especially for Enter
                        // We remove dangerouslySetInnerHTML and onInput for live typing
                        // The content is managed directly by contentEditable and synced on blur/explicit actions.
                    ></div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4 justify-center mb-6">
                    <button
                        onClick={generateHtmlCss}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                    >
                        產生 HTML + CSS
                    </button>
                    <button
                        onClick={exportSettings}
                        className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                    >
                        匯出設定檔
                    </button>
                    <label className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg shadow-md cursor-pointer transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50">
                        匯入設定檔
                        <input
                            type="file"
                            accept=".json"
                            onChange={importSettings}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={clearAllContent}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                    >
                        清空所有內容
                    </button>
                </div>
            </div>

            {/* Generated HTML Output */}
            {generatedHtml && (
                <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">產生的 HTML + CSS 程式碼</h2>
                    <div className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto text-sm">
                        <pre><code>{generatedHtml}</code></pre>
                    </div>
                    {/* New Copy Button */}
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={copyToClipboard}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                        >
                            複製程式碼
                        </button>
                    </div>
                    <p className="text-center text-gray-600 mt-4 text-sm">您可以複製上述程式碼並將其貼到您的 HTML 檔案中。</p>
                </div>
            )}

            {/* Scroll to Top Button */}
            {showScrollToTopButton && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    title="回到頂部"
                >
                    {/* SVG for an upward arrow */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export default App;
