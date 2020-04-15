import os, json

from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.converter import PDFPageAggregator, HTMLConverter, XMLConverter
from pdfminer.layout import LAParams, LTComponent, LTContainer, LTTextBox, LTImage, LTFigure
from pdfminer.pdfpage import PDFPage
from pdfminer.image import ImageWriter

def convert(path, ignore=[], multipage=[]):
	rsrcmgr=PDFResourceManager()
	device=PDFPageAggregator(rsrcmgr, laparams=LAParams())
	interpreter=PDFPageInterpreter(rsrcmgr, device)
	imagewriter=ImageWriter(os.path.join(os.path.dirname(path),'images'))
	fp=open(path, 'rb')
	slides=[]
	slides_dir=lambda fname: os.path.join(os.path.dirname(path),'slides', fname)
	if not os.path.exists(slides_dir("")):
	    os.makedirs(slides_dir(""))
	for page_number, page in enumerate(PDFPage.get_pages(fp)):
		interpreter.process_page(page)
		layout=device.get_result()
		if page_number in multipage:
			slides+=convert_multipage(page, layout, imagewriter, str(page_number), slides_dir)
		elif page_number not in ignore:
			slides.append(convert_page(page, layout, imagewriter, str(page_number), slides_dir))
	fp.close()
	device.close()
	with open(os.path.join(os.path.dirname(path),"slides.js"), "w") as fp:
		fp.write("slides=JSON.parse("+json.dumps(json.dumps(slides))+")")

svg_tag=lambda page, width, height: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '+\
	'viewBox="'+" ".join(str(j) for j in page.cropbox)+'" '+\
	'width="'+str(width)+'" height="'+str(height)+'">'

def convert_page(page, layout, imagewriter, slide, slides_dir):
	width, height=page.cropbox[2]-page.cropbox[0], page.cropbox[3]-page.cropbox[1]
	position=(lambda i:'height="'+str(i.height)+'" width="'+str(i.width)+'" x="'+str(i.x0)+'" y="'+str(height-i.y1)+'"')
	masks=[]
	def extract(el, uncle=None):
		nonlocal masks
		text, content, prev="", "", None
		for i in el:
			if isinstance(i, LTContainer):
				children=extract(i, prev)
				text+=children[0]
				content+=children[1]
			if isinstance(i, LTTextBox):
				text+=i.get_text()
			elif isinstance(i, LTImage):
				name=imagewriter.export_image(i)
				masks.append('<clipPath id="crop-'+str(len(masks))+'"><rect '+position(uncle)+'/></clipPath>')
				content+='<image xlink:href="../images/'+name+'" '+position(i)+' clip-path="url(#crop-'+str(len(masks)-1)+')"/>'
			if not i.__dict__.get("fill", True):
				content+='<rect fill="#ffffff" '+position(i)+'/>'
			if isinstance(i, LTComponent):
				prev=i
		return text, content
	text, content=extract(layout)
	with open(slides_dir(slide+'.svg'), 'w') as fp:
		fp.write(svg_tag(page, width, height)+"<defs>"+"".join(masks)+"</defs>"+content+'</svg>')
	return 'slides/'+slide+'.svg', text.strip()

def convert_multipage(page, layout, imagewriter, slide, slides_dir):
	width, height=page.cropbox[2]-page.cropbox[0], page.cropbox[3]-page.cropbox[1]
	def extract(el, uncle=None):
		images, text, prev=[], [], None
		for i in el:
			if isinstance(i, LTContainer):
				children=extract(i, prev)
				images+=children[0]
				text+=children[1]
			if isinstance(i, LTTextBox):
				text.append((i, i.bbox))
			if isinstance(i, LTImage):
				images.append((i, uncle.bbox))
			if isinstance(i, LTComponent):
					prev=i
		return images, text
	images, text=extract(layout)
	n, slides=0, []
	for i,j in images:
		res=[]
		target=(j[0]+j[2])/2
		for k,l in text+images:
			if l[0]<target<l[2] and l[1]<j[1]:
				res.append((k, l))
		res.sort(key=lambda x: (-x[1][1], -x[1][0]))
		for k,l in enumerate(res):
			if isinstance(l[0], LTImage):
				res=res[:k]
		matched="".join(k[0].get_text() for k in res)
		name=imagewriter.export_image(i)
		with open(slides_dir(slide+'_'+str(n)+'.svg'), 'w') as fp:
			scale=.9*min(width/i.width, height/i.height)
			fp.write(svg_tag(page, width, height)+'<image xlink:href="../images/'+name+'" width="'+str(i.width*scale)+'" height="'+str(i.height*scale)+\
				'" x="'+str((width-i.width*scale)/2)+'" y="'+str((height-i.height*scale)/2)+'"/></svg>')
		slides.append(('slides/'+slide+'_'+str(n)+'.svg', matched.strip()))
		n+=1
	return slides

#convert(os.path.join(os.path.dirname(os.path.realpath(__file__)), "2018.pdf"), [0, 1, 4, 7, 10, 59], [3, 5, 6, 8, 9])
convert(os.path.join(os.path.dirname(os.path.realpath(__file__)), "2019.pdf"), [0, 1, 4, 7, 10, 58], [3, 5, 6, 8, 9])
