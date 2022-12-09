/**
 * Video player module
 */
;
((Themify, doc) => {
    'use strict';
    let isLoaded = false;
    const _CLICK_ = Themify.click,
            _IS_IOS_ = /iPhone|iPad|iPod|Mac OS/i.test(window.navigator.userAgent),
            _COOKIE_ = 'tf_video_',
            humanTime = time => {
                time = Infinity === time ? 0 : time;
                const tmp = new Date(time * 1000).toISOString().substr(11, 8).split(':');
                if (tmp[0] === '00') {
                    tmp.splice(0, 1);
                }
                return tmp.join(':');
            },
            requestFullscreen = el => {
                try {
                    if (el.requestFullscreen) {
                        return el.requestFullscreen();
                    }
                    if (el.webkitEnterFullscreen) {
                        return el.webkitEnterFullscreen();
                    }
                    if (el.webkitrequestFullscreen) {
                        return el.webkitRequestFullscreen();
                    }
                    if (el.mozRequestFullscreen) {
                        return el.mozRequestFullScreen();
                    }
                } catch (e) {
                    return false;
                }
            },
            exitFullscreen = () => {
                try {
                    if (doc.exitFullscreen) {
                        return doc.exitFullscreen();
                    }
                    if (doc.webkitExitFullscreen) {
                        return doc.webkitExitFullscreen();
                    }
                    if (doc.webkitExitFullscreen) {
                        return doc.webkitExitFullscreen();
                    }
                    if (doc.mozCancelFullScreen) {
                        return doc.mozCancelFullScreen();
                    }
                    if (doc.cancelFullScreen) {
                        return doc.cancelFullScreen();
                    }
                    if (doc.msExitFullscreen) {
                        return doc.msExitFullscreen();
                    }
                    return false;
                } catch (e) {
                    return false;
                }
            },
            getPrefix = el => {
                if (doc.exitFullscreen) {
                    return '';
                }
                if (doc.webkitExitFullscreen || el.webkitSupportsFullscreen) {
                    return 'webkit';
                }
                if (doc.mozCancelFullScreen) {
                    return 'moz';
                }
                if (doc.msExitFullscreen) {
                    return 'ms';
                }
                return false;
            },
            getFullScreenElement = el => {
                const pre = getPrefix(el);
                if (pre === false) {
                    return false;
                }
                if (el.hasOwnProperty('webkitDisplayingFullscreen')) {
                    return el.webkitDisplayingFullscreen;
                }
                return pre === '' ? doc.fullscreenElement : doc[pre + 'FullscreenElement'];
            },
            createSvg = (icon, cl) => {
                const ns = 'http://www.w3.org/2000/svg',
                        use = doc.createElementNS(ns, 'use'),
                        svg = doc.createElementNS(ns, 'svg');
                icon = 'tf-' + icon;
                cl = cl ? (icon + ' ' + cl) : icon;
                svg.setAttribute('class', 'tf_fa ' + cl);
                use.setAttributeNS(null, 'href', '#' + icon);
                svg.appendChild(use);
                return svg;
            },
            getCookie = name => {
                const nameEQ = _COOKIE_ + name + '=';
                for (let ca = doc.cookie.split(';'), i = ca.length - 1; i > -1; --i) {
                    let c = ca[i];
                    while (c[0] === ' ') {
                        c = c.substring(1, c.length);
                    }
                    if (c.indexOf(nameEQ) === 0) {
                        return c.substring(nameEQ.length, c.length);
                    }
                }
                return null;
            },
            setCookie = (name, value, days) => {
                let expires = '';
                name = _COOKIE_ + name;
                if (days) {
                    const date = new Date();
                    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                    expires = ';expires=' + date.toUTCString();
                }
                doc.cookie = name + '=' + (value || '') + expires + ';SameSite=strict;path=/';
            },
            getID = el => {
                return Themify.hash(el.currentSrc.split('.').slice(0, -1).join('.'));
            },
            togglePlayList=(el,open)=>{
                el.closest('.tf_vd_lazy').classList.toggle('tf_pl_hidden',open);
            },
            hoverPlay=el=>{
                const hover=async function(e){
                    if(!doc.fullscreenElement){
                        const video=el.tagName==='VIDEO'?el:el.tfTag('video')[0];
							try{
								await playVideo(video,true);
							}
							catch(e){

							}
							this.tfOn('mouseleave',e=>{
								if(!video.paused && !doc.fullscreenElement){
									video.pause();
									video.currentTime = 0;    
								}
							},{passive:true,once:true});
                    }
                };
                el.tfOn('mouseenter',hover,{passive:true});
                if(el.dataset.forceplay || el.matches(':hover') ){
                    hover.call(el);
                }
            },
            generateTracks=(opt,el)=>{
                const tracks=opt.tracks,
				currentClicked=doc.createElement('div'),
				container=doc.createElement('div'),
                wrap=doc.createElement('div'),
                selected=doc.createElement('div'),
                close=doc.createElement('button'),
                open=doc.createElement('button'),
                f=doc.createDocumentFragment(),
                f2=doc.createDocumentFragment(),
                f3=doc.createDocumentFragment(),
                obs=new IntersectionObserver((entries,self)=>{
                    for (let i = entries.length - 1; i > -1; --i) {
                        if (entries[i].isIntersecting === true) {
                            let item=entries[i].target,
                                video=item.tfTag('video')[0];
                            self.unobserve(item);
                            if (video.readyState === 4) {
                                item.tfClass('tf_pl_duration')[0].textContent=humanTime(video.duration);
                            }
                            else{
                                item.className+=' tf_lazy';
                                video.tfOn('durationchange',function(){
                                    item.tfClass('tf_pl_duration')[0].textContent=humanTime(this.duration);
                                    item.classList.remove('tf_lazy');
                                    hoverPlay(item);
                                },{passive:true,once:true})
                                .load();
                            }
                        }
                    }
                },{
                    root:container,
                    threshold:.3
                }),
                setSelected=function(){
                    requestAnimationFrame(()=>{
                        const playlist=this.parentNode.tfClass('tf_pl')[0],
                        selected=playlist.tfClass('tf_pl_selected')[0],
                        src=this.currentSrc.replace('#t=1','')+'#t=1';
                        let found;
                        for(let items=playlist.tfTag('video'),i=items.length-1;i>-1;--i){
                            if(src===items[i].src){
                                found=items[i];
                                break;
                            }
                        }
                        if(selected){
                            selected.classList.remove('tf_pl_selected');
                        }
                        if(found){
                            const item=found.closest('.tf_pl_item');
                            playlist.parentNode.tfClass('tf_pl_selected_title')[0].textContent=item.title;
                            item.classList.add('tf_pl_selected');
                        }
                    });
                };
                wrap.className='tf_pl_wr tf_h';
				container.className='tf_pl tf_w tf_h tf_box tf_abs_t tf_scrollbar';
				currentClicked.className='tf_playlist_current';
                close.className='tf_pl_close tf_close tf_box';
                open.className='tf_pl_open tf_box tf_hide';
                open.type=close.type='button';
                selected.className='tf_pl_selected_title tf_overflow';
				for(let i=0,len=tracks.length;i<len;++i){
					if(tracks[i].src){
						tracks[i].src=tracks[i].src.trim();
						let item=doc.createElement('div'),
                            duration=doc.createElement('div'),
                            wr=doc.createElement('div'),
						title=doc.createElement('span'),
                        caption=doc.createElement('span'),
                        video=doc.createElement('video'),
						sizes=tracks[i].dimensions?(tracks[i].dimensions.resized || tracks[i].dimensions.original):{width:el.width,height:el.height};
                        video.preload='none';
						video.width=sizes.width;
						video.height=sizes.height;
                        video.src=tracks[i].src+'#t=1';
						video.style.aspectRatio=sizes.width/sizes.height;
                        video.muted=true;
						if(!tracks[i].type || video.canPlayType(tracks[i].type)){
							item.className='tf_pl_item tf_rel tf_box';
							wr.className='tf_pl_info tf_overflow';
							duration.className='tf_pl_duration tf_textc';
                            obs.observe(item);
							if(tracks[i].title){
                                title.className='tf_pl_title tf_overflow';
								title.textContent=item.title=tracks[i].title;
                                wr.appendChild(title);
							}
							if(tracks[i].caption){
                                caption.className='tf_pl_cap tf_overflow';
								caption.textContent=tracks[i].caption;
                                wr.appendChild(caption);
							}
							item.append(video,wr,duration);
                            f.appendChild(item);
						}
						else{
							tracks.slice(i,1);
						}
					}
					else{
						tracks.slice(i,1);
					}
				}
				wrap.tfOn(_CLICK_,e=>{
                    e.stopPropagation();
					const item=e.target?e.target.closest('.tf_pl_item,.tf_pl_close'):null;
					if(item){
                        if(item.classList.contains('tf_pl_close')){
                            togglePlayList(item,!item.closest('.tf_pl_hidden'));
                        }
                        else{
                            const video=doc.createElement('video');
                            video.src=item.tfTag('video')[0].src.replace('#t=1','');
                            video.tfOn('canplay', function () {
                                requestAnimationFrame(()=>{
                                    el.pause();
                                    el.src=this.currentSrc;
                                    el.play();
                                });
                            }, {passive: true, once: true})
                            .load();
                        }
					}
				},{passive:true});
                
                el.tfOn('durationchange',setSelected,{passive:true});
                open.tfOn(_CLICK_,e=>{
                    e.stopImmediatePropagation();
                    togglePlayList(e.currentTarget,false);
                },{passive:true});
                for(let i=8;i>-1;--i){
                    let b=doc.createElement('span');
                    b.className='tf_h';
                    f3.appendChild(b);
                }
                open.appendChild(f3);
                container.appendChild(f);
                wrap.append(selected,close,container);
                f2.append(open,wrap);
                if(el.readyState === 4){
                    setTimeout(()=>{
                        setSelected.call(el);
                    },100);
                }
                else{
                    el.tfOn('loadeddata',setSelected,{passive:true,once:true});
                }
				return f2;
            },
			showLowPowerControls =el=>{
				if(el.hasAttribute('data-hide-controls')&& !el.parentNode.tfClass('tf_vd_pw_play')[0]){
					const play=doc.createElement('button');
					play.className='tf_vd_play tf_abs_t tf_vd_pw_play';
                    play.type='button';
					el.after(play);
				}
			},
            playVideo = async (el,err) => {
                if(el.paused){
                    if (!el.dataset.playing) {
                        el.dataset.playing=1;
                        if(Themify.device!=='desktop'){
                            el.muted = true;
                        }
                    }
                    try{
                        await el.play();
                    }
                    catch(e){
						 try{
							if(!el.muted){
								el.muted = true;
								await el.play();
							}
							else{
								throw e;
							}
						}
						catch(e){
							if(el.paused){
								showLowPowerControls(el);
								if(err){
									throw e;
								}
							}
						}
                    }
                }
            },
            controls = el => {
                let sliding = false,
                        paused = true;//For error play-request-was-interrupted
                const fr = doc.createDocumentFragment(),
                        pre = getPrefix(el),
                        id = getID(el),
                        vols = getCookie('vol_' + id) || -1,
                        wrap = doc.createElement('div'),
                        parentNode = el.parentNode,
                        progressWrap = doc.createElement('div'),
                        progressLoaded = doc.createElement('div'),
                        progressCurrent = doc.createElement('div'),
                        hoverHandler = doc.createElement('div'),
                        volumeWrap = doc.createElement('div'),
                        volumeInner = doc.createElement('div'),
                        controls = doc.createElement('div'),
                        playWrap = doc.createElement('div'),
                        currentTime = doc.createElement('div'),
                        totalTime = doc.createElement('div'),
                        mute = doc.createElement('button'),
                        play = doc.createElement('button'),
                        fullscreen = doc.createElement('button'),
                        seekLeft = doc.createElement('button'),
                        seekRight = doc.createElement('button'),
                        range = doc.createElement('input'),
                        volumeRange = doc.createElement('input'),
                        hasVolume = _IS_IOS_ === false || Themify.device !== 'mobile',
                        parentCl = parentNode.classList,
                        pipCallback = () => {
                    try {
                        if (el.webkitSupportsPresentationMode) {
                            el.webkitSetPresentationMode(el.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
                        } else {
                            if (getFullScreenElement(el)) {
                                exitFullscreen();
                            }
                            if (el !== doc.pictureInPictureElement) {
                                el.requestPictureInPicture();
                            } else {
                                doc.exitPictureInPicture();
                            }
                        }
                    } catch (er) {
                        console.error(er);
                    }
                };
                wrap.className = 'tf_vd_wr tf_w tf_mw tf_box';
                playWrap.className = 'tf_play_wrap';
                controls.className = 'tf_vd_ctl';
                progressWrap.className = 'tf_vd_pr_wr tf_rel tf_textl';
                progressLoaded.className = 'tf_vd_pr_ld tf_w tf_h tf_abs';
                progressCurrent.className = 'tf_vd_cur tf_w tf_h tf_abs';
                range.className = 'tf_vd_pr tf_h tf_abs';
                range.value = 0;
                range.type = 'range';
                range.min = 0;
                range.max = 100;
                play.className = 'tf_vd_play';
                if (vols !== -1) {
                    if (!vols) {
                        el.muted = 0;
                    } else {
                        el.volume = vols;
                    }
                }
                mute.type = play.type = fullscreen.type = seekLeft.type = seekRight.type = 'button';
                seekLeft.className = 'tf_vd_sk tf_vd_sk_left tf_abs';
                seekRight.className = 'tf_vd_sk tf_vd_sk_right tf_abs';
                currentTime.className = 'tf_vd_time';
                totalTime.className = 'tf_vd_total';
                hoverHandler.className = 'tf_vd_hover tf_abs tf_hide tf_box tf_textc';
                fullscreen.className = 'tf_vd_full';
                currentTime.textContent = humanTime(el.currentTime);
                totalTime.textContent = humanTime(el.duration);
                wrap.tfOn(_CLICK_, (e) => {
                    e.stopPropagation();
                }, {passive: true});
                play.tfOn(_CLICK_, e => {
                    e.stopPropagation();
                    if(!el.paused){
                        el.pause();
                    }
                    else{
                        playVideo(el);
                    }
                }, {passive: true});
                if (!Themify.isTouch) {
                    progressWrap.tfOn('mouseenter', function (e) {
                        if (!isNaN(el.duration)) {
                            hoverHandler.classList.remove('tf_hide');
                            const w = this.clientWidth,
                                    hoverW = parseFloat(hoverHandler.clientWidth / 2),
                                    duration = el.duration,
                                    move = e => {
                                        const x = e.layerX !== undefined ? e.layerX : e.offsetX,
                                            hoverX=Themify.isRTL?(x+hoverW):(x - hoverW);
                                        if (hoverX>0 && x>=0 && x <= w) {
                                            hoverHandler.style.transform = 'translateX(' + hoverX + 'px)';
                                            if (sliding === false) {
                                                hoverHandler.textContent = humanTime(parseFloat((x / w)) * duration);
                                            }
                                        }
                                    };
                            this.tfOn('mouseleave', function () {
                                hoverHandler.classList.add('tf_hide');
                                this.tfOff('mousemove', move, {passive: true});
                            }, {passive: true, once: true})
                            .tfOn('mousemove', move, {passive: true});
                        }
                    }, {passive: true});

                } else if (_IS_IOS_ === true) {
                    const agent = window.navigator.userAgent,
                            ver = parseFloat(agent.substr(agent.indexOf('OS ') + 3, 4).replace('_', '.'));//safari bug,Input range when clicking on track
                    if (ver < 13.5) {
                        const __changeCallback = function (e) {
                            const ev = e.type === 'touchstart' ? (e.touches[0] ? e.touches[0] : e.changedTouches[0]) : e,
                                    input = this.tfTag('input')[0],
                                    box = this.getBoundingClientRect(),
                                    v = input.classList.contains('tf_vd_vol') ? ((ev.clientY - box.top) / box.height) : ((ev.clientX - box.left) / box.width);
                            input.value = parseInt(v * 100);
                            Themify.triggerEvent(input, 'input');
                            Themify.triggerEvent(input, 'change');
                        };
                        progressWrap.tfOn(_CLICK_, __changeCallback, {passive: true});
                        if (hasVolume === true) {
                            volumeInner.tfOn(_CLICK_, __changeCallback, {passive: true});
                        }
                    }
                }
                range.tfOn('input', function (e) {
                    e.preventDefault();
                    if (!isNaN(el.duration)) {
                        if (!el.paused && paused === true) {
                            el.pause();
                        }
                        sliding = true;
                        const v = parseInt(this.value),
                                t = v === 100 ? (el.duration - 1) : parseFloat((v * el.duration) / 100).toFixed(4);
                        el.currentTime = t;
                        if (!Themify.isTouch) {
                            hoverHandler.textContent = humanTime(t);
                        }
                    }
                })
                .tfOn('change', e => {
                    e.preventDefault();
                    if (!isNaN(el.duration)) {
                        sliding = paused = false;
                        if (el.paused) {
                            el.play()
                            .catch({})
                            .finally(() => {
                                paused = true;
                            });
                        }
                    }
                });
                el.tfOn('progress', function () {
                    if (this.buffered.length > 0) {
                        progressLoaded.style.transform = 'scaleX(' + parseFloat((this.buffered.end(0)) / this.duration).toFixed(4) + ')';
                    }
                }, {passive: true})
                .tfOn('durationchange', function () {
                    totalTime.textContent = humanTime(this.duration);
                }, {passive: true})
                .tfOn('timeupdate', function () {
                    if (!isNaN(this.duration)) {
                        currentTime.textContent = humanTime(this.currentTime);
                        const v = parseFloat(this.currentTime / el.duration);
                        progressCurrent.style.transform = 'scaleX(' + v.toFixed(4) + ')';
                        if (sliding === false) {
                            range.value = parseInt(v * 100);
                        }
                        setCookie(id, this.currentTime, 30);
                    }
                }, {passive: true});
                if (pre !== false) {
                    let isAdd = false,
                    timeout2 = false;
                    const mouseMove = () => {
                        toggleControls(true);
                        checkState();
                    },
                    toggleControls = isMoved => {
                        isAdd = isAdd === true || isMoved === true ? false : true;
                                parentCl.toggle('tf_vd_hide_ctl', isAdd);
                    },
                    checkState = () => {
                        if (timeout2) {
                            clearTimeout(timeout2);
                        }
                        timeout2 = setTimeout(toggleControls, 3000);
                    },
                    showFullscreen = e => {
                        const target = e.touches ? e.touches[0].target : e.target;
                        if (e.type !== 'dblclick' || target && !target.closest('.tf_vd_wr')) {
                            e.preventDefault();

                            if (getFullScreenElement(el)) {
                                exitFullscreen(el);
                            } else {
                                const __calback = () => {
                                    const promise = requestFullscreen(parentNode);
                                    if (!promise) {
                                        requestFullscreen(el);
                                    }
                                };
                                if (doc.pictureInPictureElement || el.webkitPresentationMode === 'picture-in-picture') {
                                    pipCallback();
                                    setTimeout(__calback, 80);
                                } else {
                                    __calback();
                                }
                            }
                        }
                    };
                    fullscreen.tfOn(_CLICK_, showFullscreen);
                    if (!Themify.isTouch) {
                        parentNode.tfOn('dblclick', showFullscreen);
                    }
                    parentNode.tfOn(pre + 'fullscreenchange', e => {
                        if (!getFullScreenElement(el)) {
                            parentCl.remove('tf_is_fullscreen', 'tf_vd_hide_ctl');
                            if (timeout2) {
                                clearTimeout(timeout2);
                            }
                            el.tfOff('pause', mouseMove, {passive: true});
                            parentNode.tfOff('mousemove', mouseMove, {passive: true});
                        } else {
                            parentCl.add('tf_is_fullscreen');
                            parentNode.tfOn('mousemove', mouseMove, {passive: true});
                            el.tfOn('pause', mouseMove, {passive: true});
                            checkState();
                        }
                    }, {passive: true});
                } else {
                    fullscreen.className += ' tf_fullscreen_disabled tf_play_disabled';
                }
                fullscreen.appendChild(createSvg('fas-expand'));
                progressWrap.append(progressLoaded, range, progressCurrent, hoverHandler);
                if (el.hasAttribute('data-download')) {
                    const dl = doc.createElement('a');
                    dl.setAttribute('download', '');
                    dl.href = el.src;
                    dl.className = 'tf_vd_download';
                    dl.appendChild(createSvg('fas-download'));
                    controls.appendChild(dl);           
                    Themify.fonts('tf-fas-download');

                }
                if (hasVolume === true) {

                    volumeRange.tfOn('input', function (e) {
                        e.preventDefault();
                        const v = parseFloat(this.value / 100).toFixed(3);
                        el.volume = v;
                        el.muted = v > 0 ? false : true;
                    });

                    el.tfOn('volumechange', function () {
                        mute.classList.toggle('tf_muted',this.muted === true || this.volume === 0);
                        setCookie('vol_' + id, this.volume, 120);
                    }, {passive: true});

                    mute.tfOn(_CLICK_, () => {
                        el.muted = !el.muted;
                        if (!el.muted && el.volume === 0) {
                            volumeRange.value = 50;
                            Themify.triggerEvent(volumeRange, 'input');
                        }
                    }, {passive: true});

                    mute.append(createSvg('fas-volume-up', 'tf_abs_t'), createSvg('fas-volume-mute', 'tf_abs_t tf_h'));
                    volumeWrap.appendChild(mute);
                    volumeRange.min = 0;
                    volumeRange.max = 100;
                    volumeRange.type = 'range';
                    volumeRange.value = vols > -1 ? (vols * 100) : 50;
                    volumeInner.className = 'tf_vd_vol_in';
                    volumeRange.className = 'tf_vd_vol tf_h tf_overflow';
                    volumeWrap.className = 'tf_vd_vol_wr tf_rel';
                    mute.className = 'tf_vd_mute tf_rel tf_overflow';
                    if (el.muted) {
                        mute.className += ' tf_muted';
                    }
                    volumeInner.appendChild(volumeRange);
                    volumeWrap.appendChild(volumeInner);
                    controls.appendChild(volumeWrap);
                }
                if (!el.hasAttribute('disablePictureInPicture') && doc.pictureInPictureEnabled) {

                    const pip = doc.createElement('button');
                    pip.tfOn(_CLICK_, pipCallback, {passive: true}).className = 'tf_vd_pip';
                    el.tfOn('enterpictureinpicture', () => {
                        parentCl.add('tf_is_pip');
                    }, {passive: true})
                    .tfOn('leavepictureinpicture', () => {
                        parentCl.remove('tf_is_pip');
                    }, {passive: true});
                    pip.appendChild(createSvg('fas-external-link-alt'));
                    controls.appendChild(pip);
                }
                controls.appendChild(fullscreen);
                playWrap.appendChild(play);
                wrap.append(playWrap, currentTime, progressWrap, totalTime, controls);
                seekRight.innerHTML = seekLeft.innerHTML = '<span class="tf_abs_c">15</span>';
                seekRight.appendChild(createSvg('fas-redo', 'tf_abs_c'));
                seekLeft.appendChild(createSvg('fas-undo', 'tf_abs_c'));
                fr.append(seekLeft, seekRight, wrap);
                return fr;
            },
            loadMetaData = (el,opt) => {
                let timeout;
                const fr = doc.createDocumentFragment(),
                        parentNode = el.parentNode,
                        loader = doc.createElement('div'),
                        elapsed = parseFloat(getCookie(getID(el))) || 0,
                        bigPlay = doc.createElement('button'),
                        parentCl = parentNode.classList,
                        isPlayList=opt && opt.tracks,
                        waitingEvent = function (e) {
                            parentCl.add('tf_vd_wait');
                            const ev = e.type === 'seeking' ? 'seeked' : 'playing';
                            this.tfOn(ev, () => {
                                parentCl.remove('tf_vd_wait');
                            }, {passive: true, once: true});
                        },
                        setInteraction = () => {
                            parentCl.add('tf_vd_show');
                            parentCl.remove('tf_vd_hide_ctl');
                            if (timeout) {
                                clearTimeout(timeout);
                            }
                            timeout = setTimeout(() => {
                                parentCl.remove('tf_vd_show');
                            }, 2500);
                        };
                loader.className = 'tf_loader tf_abs_c';
                bigPlay.className = 'tf_vd_play tf_vd_big_btn tf_abs_c';
                bigPlay.appendChild(createSvg('fas-undo','tf_hide'));
                parentNode.tabIndex = 0;
                bigPlay.type = 'button';
                parentNode.tfOn(_CLICK_, function (e) {
                    const _this = e.target.closest('.tf_vd_sk');
                    e.stopImmediatePropagation();
                    if (el.paused || !Themify.isTouch || (!_this && this.classList.contains('tf_vd_show'))) {
                        this.classList.remove('tf_vd_show');
                        if (el.paused) {
                            playVideo(el);
                        } else {
                            el.pause();
                        }
                    } else {
                        setInteraction();
                        if (_this) {
                            el.currentTime += _this.classList.contains('tf_vd_sk_left') ? -15 : 15;
                        }
                    }
                }, {passive: true});
                el.tfOn('seeking waiting emptied', waitingEvent, {passive: true})
                .tfOn('pause', function () {
                    parentCl.remove('tf_vd_playing');
                }, {passive: true})
                .tfOn('play', function () {
                    togglePlayList(this,true);
                    parentCl.add('tf_vd_playing');
                    for (let allVideos = doc.tfTag('video'), i = allVideos.length - 1; i > -1; --i) {
                        if (allVideos[i] !== this && allVideos[i].readyState === 4&& !allVideos[i].paused && allVideos[i].muted !== true) {
                            allVideos[i].pause();
                        }
                    }
                }, {passive: true})
                .tfOn('playing ended', e => {
                    if(isPlayList && e.type==='ended'){
                        const item=parentNode.tfClass('tf_pl_selected')[0].nextElementSibling || parentNode.tfClass('tf_pl_item')[0];
                        Themify.triggerEvent(item,_CLICK_);
                    }
                    else{
                        parentCl.toggle('tf_vd_end',e.type==='ended');
                    }
                }, {passive: true});
                if (!el.hasAttribute('data-hide-controls')) {
                    fr.append(bigPlay, controls(el));
                }
                fr.appendChild(loader);
                if(isPlayList){
                    fr.appendChild(generateTracks(opt,el));
                }
                requestAnimationFrame(()=>{
                    if (window.WebKitPlaybackTargetAvailabilityEvent && !el.hasAttribute('data-hide-controls')) {
                        el.tfOn('webkitplaybacktargetavailabilitychanged', e => {
                            if (e.availability === 'available') {
                                const airPlay = doc.createElement('button');
                                airPlay.className = 'tf_vd_airplay';
                                airPlay.tfOn(_CLICK_, () => {
                                    el.webkitShowPlaybackTargetPicker();
                                }, {passive: true})
                                .appendChild(createSvg('fas-airplay'));
                                parentNode.querySelector('.tf_vd_full').before(airPlay);
                            }
                        }, {passive: true, once: true});
                    }
                    if (elapsed > 0 && elapsed < el.duration) {
                        el.currentTime = elapsed;
                    }
                    el.setAttribute('webkit-playsinline', '1');
                    el.setAttribute('playsinline', '1');
                    el.removeAttribute('controls');
                    parentNode.appendChild(fr);
                    parentCl.remove('tf_lazy');
                    if(!isPlayList && el.dataset.hoverPlay){
						bigPlay.style.pointerEvents='none';
                        hoverPlay(el);
                    }
                    else if (el.dataset.autoplay) {
                        el.muted=true;
                        playVideo(el);
                    }
                });
            },
            init = (items, options) => {
                for (let i = items.length - 1; i > -1; --i) {
                    let item = items[i],
                        p = item.parentNode;
                    
					if(!options){
						let p=item.parentNode.parentNode;
						if(p.classList.contains('wp-video-playlist')){
							let playlist = p.tfClass('tf-playlist-script')[0];
							if(!playlist){
								playlist=p.tfClass('wp-playlist-script')[0];
							}
							if(playlist){
								options=JSON.parse(playlist.textContent);
								if(options.type!=='video'){
									options=false;
								}
							}
						}
					}
                    if(!item.hasAttribute('src') && !item.tfTag('source')[0]){
						if(!options || !options.tracks){
                            continue;
						}
						let track=options.tracks[0].src;
						if(!track){
							for(let j=1,len=options.tracks.length;j<len;++j){
								if(options.tracks[j].src){
									track=options.tracks[j].src;
									break;
								}
							}
						}
						if(!track){
							continue;
						}

						item.src=track;
					}
                    if (!p.classList.contains('tf_vd_lazy')) {
                        let lazy = doc.createElement('div');
                        lazy.className = 'tf_vd_lazy tf_w tf_h tf_box tf_rel tf_overflow tf_lazy';
                        lazy.appendChild(item);
                        p.appendChild(lazy);
                    }
                    if (item.readyState > 2) {
                        loadMetaData(item, options);
                    } else {
                        Themify.requestIdleCallback(() => {
                            item.tfOn('canplay', function () {
                                loadMetaData(this,options);
                            }, {passive: true, once: true})
                            .load();
                        },-1, 200);
                    }
                }
            };
    Themify.on('tf_video_init', items => {
        if (isLoaded === false) {
            isLoaded = true;
            Themify.fonts(['tf-fas-volume-mute', 'tf-fas-volume-up', 'tf-fas-undo', 'tf-fas-redo', 'tf-fas-external-link-alt', 'tf-fas-airplay', 'tf-far-closed-captioning', 'tf-fas-expand']);
        }
        if (items.length === undefined) {
            items = [items];
        }
        init(items);
    });

})(Themify, document);
