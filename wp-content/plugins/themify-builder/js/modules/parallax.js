/**
 * builderParallax for row/column/subrow
 */
;
((Themify, win) => {
    'use strict';
    let prevBp,
            isScrollInit = null,
			isResizeInit=null,
            req = null,
            height = Themify.h,
            timer = null;
    const className = 'builder-parallax-scrolling',
            speedFactor = .1,
            workingItems = new Set(),
            pendingItems = new Set(),
            getcurrentBp = w => {
                const points=tbLocalScript.breakpoints;
                let bp = 'desktop';
                if (w <= points.mobile) {
                    bp = 'mobile';
                } else if (w <= points.tablet[1]) {
                    bp = 'tablet';
                } else if (w <= points.tablet_landscape[1]) {
                    bp = 'tablet_landscape';
                }
                return bp;
            },
            rect = el => {
                const box = el.getBoundingClientRect();
                return {
                    top: box.top + el.ownerDocument.defaultView.scrollY,
                    w: box.width,
                    h: box.height
                };
            },
            scroll = () => {
                requestAnimationFrame(()=>{
                    for (let obj of workingItems) {
                        if (obj && obj.el && obj.el.isConnected) {
                            if (obj.el.classList.contains(className)) {
                                obj.update();
                            }
                        } 
                        else if(obj){
                            obj.destroy();
                        }
                    }
                });
            },
            resize = e => {
                if (e) {
                    height = e.h;
                    if (timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(() => {
                        if (req) {
                            cancelAnimationFrame(req);
                        }
                        req = requestAnimationFrame(() => {
                            const bp = getcurrentBp(e.w);
                            for (let obj of workingItems) {
                                if (obj && obj.el && obj.el.isConnected) {
                                    if (prevBp !== bp) {
                                        if (!obj.isInBreakpoint()) {
                                            pendingItems.add(obj);
                                            if (obj) {
                                                obj.destroy();
                                            }
                                            continue;
                                        }
                                        obj.getImage().then(() => {
                                            obj.update();
                                        }).catch(e => {
                                            if (obj) {
                                                obj.destroy();
                                            }
                                        });
                                    } else {
                                        obj.update();
                                    }
                                } else if (obj) {
                                    obj.destroy();
                                }
                            }
                            if (prevBp !== bp) {
                                prevBp = bp;
                                for (let obj of pendingItems) {
                                    if (obj.el.isConnected) {
                                        if (obj.isInBreakpoint()) {
                                            obj.init();
                                            pendingItems.delete(obj);
                                        }
                                    } else {
                                        pendingItems.delete(obj);
                                    }
                                }
                            }
                            req=timer=null;
                        });

                    }, 20);
                }
            };
    class Parallax{
        constructor(el){
            if (!Themify.is_builder_active) {
                el.removeAttribute('data-parallax-bg');
            }
            this.el = el;
            if (this.isInBreakpoint()) {
                this.init();
            } else {
                el.classList.remove(className);
                pendingItems.add(this);
            }
            if (isResizeInit === null) {
                isResizeInit = true;
                Themify.on('tfsmartresize', resize);
            }
        }
        init() {
            if (isScrollInit === null) {
                isScrollInit = true;
                win.tfOn('scroll', scroll, {passive: true});
            }
            this.getImage().then(() => {
                this.el.classList.add(className);
                workingItems.add(this);
                this.update();
            }).catch(e => {

            });
        }
        isInBreakpoint() {
            return getComputedStyle(this.el).getPropertyValue('--tbBg') === 'parallax';
        }
        getImage() {
            return new Promise((resolve, reject) => {
                let src = getComputedStyle(this.el).getPropertyValue('background-image');
                if (src && src !== 'none' && src !== 'initial' && src !== 'unset') {
                    src = src.replace(/(url\(|\)|")/g, '');
                    if (/\.(jpg|jpeg|png|webp|avif|gif|svg|apng)$/.test(src)) {
                        const image = new Image();
                        image.src = src;
                        image.decode()
                                .then(() => {
                                    this.w = image.width;
                                    this.h = image.height;
                                    resolve();
                                })
                                .catch(e => {
                                    console.error('Parrallax(' + src + '): ' + e);
                                    reject();
                                });
                    }

                } else {
                    reject();
                }
            });
        }
        destroy() {
            workingItems.delete(this);
            this.el.classList.remove(className);
            this.el.style.backgroundSize = this.el.style.backgroundPositionY = '';
            if (workingItems.size === 0) {
                if (pendingItems.size === 0) {
                    Themify.off('tfsmartresize', resize);
					isResizeInit=null;
                }
                win.tfOff('scroll', scroll, {passive: true});
                isScrollInit = null;
            }
        }
        update() {
            const pos = this.el.ownerDocument.defaultView.scrollY,
                    box = rect(this.el),
                    top = box.top,
                    outerHeight = box.h,
                    posY = (top - pos) * speedFactor;
            // Check if totally above or totally below viewport
            if ((top + outerHeight) < pos || top > (pos + height)) {
                return;
            }
            this.el.style.backgroundPositionY = 'calc(50% + ' + Math.round(posY) + 'px)';

            // calculate background-size: cover
            const coverRatio = Math.max((box.w / this.w), (outerHeight / this.h));
            let newImageWidth = Math.round(this.w * coverRatio),
                    newImageHeight = Math.round(this.h * coverRatio);

            if (newImageHeight === Math.round(outerHeight)) {
                // image is the exact height as the row, this will cause gap when backgroundPositionY changes; enlarge the image
                newImageWidth *= 1.3;
                newImageHeight *= 1.3;
                this.el.style.backgroundSize = Math.round(newImageWidth) + 'px ' + Math.round(newImageHeight) + 'px';
            } else {
                this.el.style.backgroundSize = '';
            }

        }
    }
    prevBp = getcurrentBp(Themify.w);
    Themify.on('builder_load_module_partial', (el, isLazy) => {
        let items;
        if (isLazy === true) {
            if (!el.hasAttribute('data-parallax-bg')) {
                return;
            }
            items = [el];
        } else {
            items = Themify.selectWithParent('[data-parallax-bg]', el);
        }

        for (let i = items.length - 1; i > -1; --i) {		
            new Parallax(items[i]);
        }
    });

})(Themify, window);
