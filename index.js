function paged(container, initial, leftgenerator, rightgenerator){
	if(!rightgenerator){
		var leftinitial=leftgenerator
		leftgenerator=rightgenerator=initial
		if(leftinitial) initial=initial(leftinitial)
	}
	container.style.position="relative"
	container.style.whiteSpace="nowrap"
	container.style.overflowX="hidden"
	var left, middle, right, idx=leftinitial||0
	function createleft(){
		left=leftgenerator(idx-1, middle)
		if(left){
			container.insertBefore(left, middle)
			left.style.marginLeft="-100%"
			left.style.display="inline-block"
			left.style.width="100%"
		}
	}
	function createright(){
		right=rightgenerator(idx+1, middle)
		if(right){
			container.appendChild(right)
			right.style.display="inline-block"
			right.style.width="100%"
		}
	}
	function createmiddle(initial, position){
		while(container.children.length) container.removeChild(container.firstChild)
		if(typeof initial==='function'){
			initial=initial(position||0)
			idx=position||0
		}
		middle=initial
		middle.style.display="inline-block"
		middle.style.width="100%"
		container.appendChild(middle)
		createleft()
		createright()
	}
	function transform(d){
		var rule="translateX("+d+"px)"
		if(left) left.style.transform=rule
		middle.style.transform=rule
		if(right) right.style.transform=rule
	}
	function transformduration(t){
		t=t?"transform "+t+"s":""
		if(left) left.style.transition=t
		middle.style.transition=t
		if(right) right.style.transition=t
	}
	createmiddle(initial)
	var startpos=false, prevpos=[], velocitybuffer=3, velocitythreshold=0.5, transitioning=false,
		staticthreshold=0.6, staticvelocitythreshold=-velocitythreshold/6
	function touchlocation(e){
		return e.changedTouches[0].screenX
	}
	function containerwidth(){
		return container.getBoundingClientRect().width
	}
	function touchstart(event){
		if(!transitioning){
			startpos=touchlocation(event)
			prevpos.push({pos: startpos, t: (new Date()).getTime()})
		}
	}
	function touchmove(event){
		if(startpos!==false){
			var loc=touchlocation(event)
			prevpos.push({pos: loc, t: (new Date()).getTime()})
			if(prevpos.length>velocitybuffer){
				prevpos.shift()
			}
			transform(loc-startpos)
		}
	}
	function touchend(event){
		if(startpos!==false){
			var width=containerwidth(), loc=touchlocation(event), prev=prevpos.shift(), diff=loc-startpos,
				velocity=(loc-prev.pos)/((new Date()).getTime()-prev.t),
				dir=velocity>velocitythreshold||diff>staticthreshold*width&&velocity>staticvelocitythreshold?1:
					velocity<-velocitythreshold||diff<-staticthreshold*width&&velocity<-staticvelocitythreshold?-1:0,
				distance=Math.abs(startpos+dir*width-loc),
				time=Math.abs(distance/(Math.max(Math.abs(velocity), velocitythreshold)))
			moveto(dir>0&&left||dir<0&&right?dir:0, time/1000, width)
		}
	}
	function moveto(dir, time, width){
		transformduration(time)
		transform(dir*(width||containerwidth()))
		transitioning=true
		startpos=false
		prevpos=[]
		idx-=dir
		window.setTimeout(function(){
			transformduration(0)
			transform(0)
			transitioning=false
			if(dir){
				if(dir>0){
					if(right) container.removeChild(right)
					right=middle
					middle=left
					middle.style.marginLeft=""
					createleft()
				}else{
					if(left) container.removeChild(left)
					left=middle
					middle=right
					left.style.marginLeft="-100%"
					createright()
				}
			}
			bound()
		}, time*1000)
	}
	container.addEventListener("touchstart", touchstart, {passive: true})
	document.body.addEventListener("touchmove", touchmove, {passive: true})
	document.body.addEventListener("touchend", touchend, {passive: true})
	this.left=function(){
		if(!transitioning&&left) moveto(1, 0.3)
	}
	this.right=function(){
		if(!transitioning&&right) moveto(-1, 0.3)
	}
	this.active=function(){ return middle }
	this.index=function(){ return idx }
	this.refresh=function(initial){
		createmiddle(initial)
		bound()
	}
	bound=function(){}
	this.bind=function(callback){
		var prev=bound
		bound=function(){
			prev()
			callback(idx, middle)
		}
		callback(idx, middle)
	}
}
function load(){
	var starred="starred" in window.localStorage?JSON.parse(window.localStorage["starred"]):{}, order=false, shuffled=false, filtered=false, slide=function(idx){
			if(idx<0||idx>=(order?order.length||1:slides.length)) return false
			if(order){
				idx=order[idx]
				if(!order.length){
					var ele=document.createElement("div")
					ele.innerHTML="No matches"
					ele.classList.add("empty")
					return ele
				}
			}
			var slide=slides[idx]
			var ele=document.createElement("div")
			ele.classList.add("case")
			ele.innerHTML='<div><embed src="'+slide[0]+'" class="side"></embed><div class="side back"><div>'+slide[1]+'</div></div></div>'
			ele.onclick=function(){
				ele.classList.toggle("flipped")
			}
			return ele
		}, slideshow=new paged(document.getElementById("container"), slide, parseInt(window.location.hash.slice(1))||0),
		reset=function(){ slideshow.active().classList.remove("flipped") },
		star=document.getElementById("starred"), shuffle=document.getElementById("shuffle"),
		filterstar=document.getElementById("filter-starred"), filtertext=document.getElementById("filter-text"),
		sidebar=document.getElementById("sidebar")
	document.onkeydown=function(e){
		switch(e.keycode||e.which){
			case 37: slideshow.left(); reset(); break;
			case 39: slideshow.right(); reset(); break;
			case 38: case 40: slideshow.active().classList.toggle("flipped"); break;
			case 83: starcurrent(); break;
		}
	}
	slideshow.bind(function(idx, middle){
		idx=order?order.length?order[idx]:0:idx
		star.innerHTML=(idx in starred)&&starred[idx]?"star":"star_border"
		window.location.hash="#"+idx
	})
	function starcurrent(){
		var initial=slideshow.index()
		idx=order?order.length?order[initial]:0:initial
		if(idx in starred) starred[idx]^=true
		else starred[idx]=true
		window.localStorage["starred"]=JSON.stringify(starred)
		star.innerHTML=starred[idx]?"star":"star_border"
		if(!starred[idx]&&("starred" in filters)&&filters["starred"]){
			filters["starred"].splice(filters["starred"].indexOf(idx),1)
			bindfilter()
		}
	}
	star.onclick=starcurrent
	shuffle.onclick=function(){
		if(shuffled){
			shuffled=false
			shuffle.style.color=""
		}else{
			shuffled=true
			shuffle.style.color="blue"
		}
		reshuffle()
	}
	function reshuffle(){
		if(shuffled){
			var left=[], idx
			order=[]
			if(filtered) left=filtered.slice()
			else for(var i=slides.length-1; i>=0; i--) left.push(i)
			while(left.length){
				idx=Math.floor(Math.random()*left.length)
				order.push(left[idx])
				left.splice(idx,1)
			}
		}else{
			if(filtered) order=filtered.slice()
			else order=false
		}
		slideshow.refresh(slide)
	}
	document.getElementById("previous").onclick=function(){ slideshow.left(); reset() }
	document.getElementById("next").onclick=function(){ slideshow.right(); reset() }
	var filters={}
	function bindfilter(name, list){
		if(name) filters[name]=list
		filtered=false
		for(var i in filters){
			if(filters[i]){
				if(filtered){
					for(var j=filtered.length-1; j>=0; j--){
						if(filters[i].indexOf(filtered[j])==-1){
							filtered.splice(j,1)
						}
					}
				}else{
					filtered=filters[i].slice()
				}
			}
		}
		reshuffle()
	}
	filterstar.onclick=function(){
		filterstar.classList.toggle("active")
		if(filterstar.classList.contains("active")){
			var updated=[]
			for(var i in starred){
				if(starred[i]){
					updated.push(parseInt(i))
				}
			}
			bindfilter("starred", updated)
		}else{
			bindfilter("starred", false)
		}
	}
	filtertext.oninput=function(e){
		var text=filtertext.value
		if(text){
			var updated=[]
			for(var i=slides.length-1; i>=0; i--){
				if(slides[i][1].toLowerCase().indexOf(text.toLowerCase())>=0){
					updated.push(i)
				}
			}
			bindfilter("text", updated)
		}else{
			bindfilter("text", false)
		}
	}
	filtertext.onkeydown=function(e){ e.stopPropagation() }
	document.getElementById("menu").onclick=function(){ sidebar.classList.add("active") }
	document.getElementById("mobile-close").onclick=function(){ sidebar.classList.remove("active") }
}
window.onload=function(){ window.setTimeout(load, 0) }