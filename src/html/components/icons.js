let purgeSVG = '<path d="M8,15c-3.866,0-7-3.134-7-7s3.134-7,7-7s7,3.134,7,7S11.866,15,8,15z M8,3C5.238,3,3,5.238,3,8c0,2.762,2.238,5,5,5 c2.762,0,5-2.238,5-5C13,5.238,10.762,3,8,3z"></path><path d="M5.558,4.582l5.861,5.86l-0.978,0.978l-5.86-5.861L5.558,4.582z M10.441,4.582l0.978,0.977l-5.861,5.861l-0.977-0.978 L10.441,4.582z"></path>';
if (localStorage.tmtJackyScrubby == 'true') {
    purgeSVG = '<path d="M2,4v12h12V4H2z M5.3,13.3C5.3,13.7,5,14,4.7,14S4,13.7,4,13.3V6.7C4,6.3,4.3,6,4.7,6s0.7,0.3,0.7,0.7V13.3z M8.7,13.3C8.7,13.7,8.4,14,8,14s-0.7-0.3-0.7-0.7V6.7C7.3,6.3,7.6,6,8,6s0.7,0.3,0.7,0.7V13.3z M12,13.3c0,0.4-0.3,0.7-0.7,0.7s-0.7-0.3-0.7-0.7V6.7C10.7,6.3,11,6,11.3,6S12,6.3,12,6.7V13.3z M14.7,1.3v1.3H1.3V1.3h3.8c0.6,0,1.1-0.7,1.1-1.3h3.5c0,0.6,0.5,1.3,1.1,1.3H14.7z"></path>';
}

const purge = `<button class="mod-icon" data-a-target="chat-purge-button">
    <div class="tw-tooltip-wrapper tw-inline-flex">
        <figure class="tw-svg">
            <svg class="tw-svg__asset tw-svg__asset--inherit" width="16px" height="16px" version="1.1" viewBox="0 0 16 16" x="0px" y="0px">
            ${purgeSVG}
            </svg>
        </figure>
    <div class="tw-tooltip tw-tooltip--up tw-tooltip--align-center" data-a-target="tw-tooltip-label" role="tooltip">Purge</div>
    </div>
</button>`;

export default {
    purge
};