# (Legacy) Generates flat SVG fallback illustrations for built-in exercises (same style for all).
import os,json
OUT=os.path.join(os.path.dirname(__file__),'..','img')
BG={'חזה':'#fde2e4','גב':'#dbeafe','כתפיים':'#ede9fe','יד קדמית':'#dcfce7','יד אחורית':'#fef3c7','רגליים':'#ffedd5','בטן':'#cffafe'}
SKIN='#f2b48a';SHIRT='#2563eb';PANTS='#1f2937';FAR='#94a3b8';MET='#475569';PAD='#334155';PL='#111827'
def L(a,b,c,w):return f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>'
def P(pts,c,w):return f'<polyline points="{" ".join(f"{x},{y}" for x,y in pts)}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
def R(x,y,w,h,c,r=4):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}"/>'
def C(x,y,r,c):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>'
def off(p,d=(5,-3)):return (p[0]+d[0],p[1]+d[1])
def fig(head,sh,hip,knee,foot,elb,hand,far=None,farleg=None,fararm=None):
    """near-side limbs; far side drawn lighter. far: offset or explicit."""
    s=''
    fk,ff=farleg if farleg else (off(knee),off(foot))
    fe,fh=fararm if fararm else (off(elb),off(hand))
    s+=P([off(hip),fk,ff],'#4b5563',13)+P([off(sh),fe,fh],'#e09a6c',9)
    s+=P([hip,knee,foot],PANTS,14)+L(foot,(foot[0]+(9 if foot[0]>=knee[0]-30 else 9),foot[1]),PL,7)
    s+=L(sh,hip,SHIRT,22)+C(*head,13,SKIN)+L(sh,head,SKIN,7)+C(*head,13,SKIN)
    s+=P([sh,elb,hand],SHIRT,10)+L(elb,hand,SKIN,9)+C(*hand,5,SKIN)
    return s
def bar_side(x,y):return C(x,y,19,PL)+C(x,y,6,MET)
def bar_front(x1,x2,y):return L((x1,y),(x2,y),MET,4)+R(x1-6,y-18,9,36,PL,3)+R(x2-3,y-18,9,36,PL,3)
def db(x,y):return R(x-12,y-5,24,10,PL,4)+C(x-11,y,7,PL)+C(x+11,y,7,PL)
def bench(x,y,w=110,h=12):return R(x,y,w,h,PAD)+L((x+12,y+h),(x+12,255),MET,5)+L((x+w-12,y+h),(x+w-12,255),MET,5)
def stack(x,top=40,cable_to=None,pulley=None):
    s=R(x-14,top,28,215,'#cbd5e1',6)+''.join(R(x-11,150+i*10,22,8,PL,2) for i in range(10))+L((x,top+8),(x,150),MET,3)
    if cable_to:
        pu=pulley or (x,top+6);s+=C(*pu,6,MET)+L(pu,cable_to,'#111',2.5)
    return s
def floor():return L((10,256),(290,256),'#94a3b8',3)
def svg(group,body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="{BG[group]}"/>{floor()}{body}</svg>'
E=[]
def ex(id,name,group,body):E.append((id,name,group,svg(group,body)))
# ---------- CHEST ----------
lie=dict(head=(78,172),sh=(98,180),hip=(160,182),knee=(196,200),foot=(200,255))
ex('bench-press','לחיצת חזה במוט','חזה',bench(70,190,130)+fig(**lie,elb=(100,160),hand=(102,125))+L((90,125),(115,125),MET,3)+bar_side(102,125)+L((80,190),(80,110),MET,5)+L((74,110),(86,110),MET,5))
ex('incline-press','לחיצת חזה שיפוע עליון','חזה',L((95,205),(140,140),PAD,14)+R(120,198,70,12,PAD)+L((130,210),(130,255),MET,5)+L((180,210),(180,255),MET,5)+fig(head=(130,128),sh=(130,148),hip=(160,195),knee=(205,200),foot=(210,255),elb=(118,128),hand=(118,92))+bar_side(118,92))
ex('pec-deck','מכונת פרפר','חזה',R(200,80,14,175,'#cbd5e1',6)+R(150,180,60,12,PAD)+R(190,105,12,70,PAD)+L((165,192),(165,255),MET,5)+fig(head=(180,95),sh=(180,118),hip=(178,180),knee=(140,184),foot=(140,255),elb=(140,110),hand=(110,112),fararm=((215,108),(235,112)))+R(100,100,14,30,PAD)+R(232,100,14,30,FAR))
ex('chest-press-machine','לחיצת חזה במכונה','חזה',stack(250,60)+R(170,180,50,12,PAD)+R(205,100,12,80,PAD)+L((190,192),(190,255),MET,5)+fig(head=(200,92),sh=(198,116),hip=(196,180),knee=(160,186),foot=(160,255),elb=(178,125),hand=(150,122))+L((150,122),(140,90),MET,6)+L((140,90),(240,80),MET,6)+R(142,112,10,22,PL))
ex('cable-crossover','קרוסאובר','חזה',stack(30,30,(140,165),(30,40))+stack(270,30,(160,165),(270,40))+fig(head=(150,95),sh=(150,118),hip=(150,180),knee=(140,218),foot=(140,255),elb=(130,140),hand=(145,165),farleg=((165,215),(170,255)),fararm=((170,140),(158,165))))
# ---------- BACK ----------
ex('lat-pulldown','פולי עליון','גב',stack(250,25,(150,45),(250,32))+L((150,45),(250,32),'#111',2.5)+L((95,48),(205,48),PL,6)+R(120,200,60,12,PAD)+L((150,212),(150,255),MET,5)+R(165,175,30,10,PAD)+fig(head=(150,118),sh=(150,138),hip=(150,198),knee=(185,190),foot=(190,255),elb=(118,90),hand=(110,52),fararm=((182,90),(190,52))))
ex('seated-row','חתירה בישיבה','גב',stack(270,40,(225,165),(270,170))+R(240,180,20,40,PAD)+R(100,225,130,12,PAD)+fig(head=(135,112),sh=(140,132),hip=(130,212),knee=(180,190),foot=(232,205),elb=(170,140),hand=(205,160))+R(203,152,10,20,PL))
ex('barbell-row','חתירה במוט','גב',fig(head=(95,118),sh=(112,128),hip=(175,140),knee=(162,195),foot=(180,255),elb=(118,175),hand=(128,190))+bar_side(128,192))
ex('pull-up','מתח','גב',L((40,40),(260,40),MET,7)+L((40,40),(40,255),MET,6)+L((260,40),(260,255),MET,6)+fig(head=(150,62),sh=(150,82),hip=(150,148),knee=(162,190),foot=(150,225),elb=(120,70),hand=(118,42),farleg=((168,188),(160,222)),fararm=((180,70),(182,42))))
ex('deadlift','דדליפט','גב',fig(head=(120,92),sh=(138,108),hip=(175,160),knee=(150,205),foot=(165,255),elb=(145,175),hand=(148,225))+bar_front(80,220,228))
# ---------- SHOULDERS ----------
ex('shoulder-press','לחיצת כתפיים','כתפיים',R(130,195,60,12,PAD)+R(185,90,12,105,PAD)+L((160,207),(160,255),MET,5)+fig(head=(170,100),sh=(170,122),hip=(170,190),knee=(130,195),foot=(130,255),elb=(140,118),hand=(140,80),fararm=((200,118),(200,80)))+db(140,76)+db(200,76))
ex('lateral-raise','הרחקה לצדדים','כתפיים',fig(head=(150,85),sh=(150,108),hip=(150,175),knee=(140,215),foot=(135,255),elb=(118,112),hand=(90,114),farleg=((160,215),(165,255)),fararm=((182,112),(210,114)))+db(88,114)+db(212,114))
ex('reverse-fly','פרפר הפוך','כתפיים',R(110,170,80,12,PAD)+L((150,182),(150,255),MET,5)+fig(head=(110,150),sh=(130,158),hip=(185,168),knee=(195,215),foot=(200,255),elb=(118,130),hand=(105,110),fararm=((145,128),(158,108)))+db(103,108)+db(160,106))
ex('face-pull','פייס פול','כתפיים',stack(270,30,(215,95),(270,95))+fig(head=(150,92),sh=(152,115),hip=(150,180),knee=(150,218),foot=(140,255),elb=(165,92),hand=(185,92),farleg=((165,215),(170,255)))+L((185,88),(215,95),PL,4)+L((185,98),(215,95),PL,4))
# ---------- BICEPS ----------
ex('barbell-curl','כפיפת מרפק במוט','יד קדמית',fig(head=(150,85),sh=(150,108),hip=(150,175),knee=(150,215),foot=(145,255),elb=(152,150),hand=(130,118))+bar_side(130,120))
ex('dumbbell-curl','כפיפה עם משקולות','יד קדמית',fig(head=(150,85),sh=(150,108),hip=(150,175),knee=(150,215),foot=(145,255),elb=(152,150),hand=(128,120),fararm=((158,148),(160,190)))+db(128,118)+db(162,192))
ex('hammer-curl','פטישים','יד קדמית',fig(head=(150,85),sh=(150,108),hip=(150,175),knee=(150,215),foot=(145,255),elb=(152,150),hand=(132,118))+R(127,100,10,34,PL,4)+R(124,98,16,8,PL,3)+R(124,128,16,8,PL,3))
ex('cable-curl','כפיפה בכבל','יד קדמית',stack(250,40,(130,122),(250,240))+fig(head=(150,85),sh=(150,108),hip=(150,175),knee=(150,215),foot=(145,255),elb=(152,150),hand=(130,120))+L((122,120),(140,120),PL,5))
# ---------- TRICEPS ----------
ex('triceps-pushdown','פושדאון בכבל','יד אחורית',stack(250,25,(135,155),(250,32))+L((135,155),(250,32),'#111',2.5)+fig(head=(150,85),sh=(152,108),hip=(150,175),knee=(150,215),foot=(145,255),elb=(148,140),hand=(135,170))+L((125,170),(145,170),PL,5))
ex('skull-crusher','פרענית צרפתית','יד אחורית',bench(70,190,130)+fig(**lie,elb=(85,130),hand=(65,150))+bar_side(65,150))
ex('dips','מקבילים','יד אחורית',L((110,140),(200,140),MET,7)+L((120,140),(120,255),MET,6)+L((190,140),(190,255),MET,6)+fig(head=(155,98),sh=(155,120),hip=(158,185),knee=(140,212),foot=(160,235),elb=(178,118),hand=(170,140)))
# ---------- LEGS ----------
ex('squat','סקוואט','רגליים',fig(head=(128,108),sh=(140,125),hip=(185,180),knee=(140,200),foot=(160,255),elb=(122,140),hand=(138,122))+bar_side(142,118))
ex('leg-press','לחיצת רגליים','רגליים',L((80,240),(150,175),PAD,16)+L((150,175),(240,85),MET,6)+R(205,70,15,60,PAD,3)+bar_side(232,110)+L((60,255),(250,255),MET,6)+fig(head=(85,195),sh=(100,205),hip=(140,200),knee=(160,140),foot=(208,110),elb=(110,225),hand=(130,232)))
ex('leg-extension','פשיטת ברכיים','רגליים',R(110,180,70,14,PAD)+R(105,100,14,82,PAD)+L((145,194),(145,255),MET,5)+L((180,190),(230,175),MET,6)+R(222,165,18,18,PAD,8)+fig(head=(130,95),sh=(128,118),hip=(135,180),knee=(182,182),foot=(232,160),elb=(140,150),hand=(158,180)))
ex('leg-curl','כפיפת ברכיים','רגליים',R(60,185,150,14,PAD)+L((80,199),(80,255),MET,5)+L((190,199),(190,255),MET,5)+fig(head=(70,170),sh=(90,178),hip=(150,180),knee=(205,178),foot=(205,130),elb=(75,195),hand=(70,198))+R(196,120,22,18,PAD,8))
ex('lunge','מכרעים','רגליים',fig(head=(150,80),sh=(150,103),hip=(150,170),knee=(110,200),foot=(105,255),elb=(152,135),hand=(152,165),farleg=((180,232),(205,255)))+db(152,170))
ex('calf-raise','תאומים','רגליים',R(115,240,70,16,PAD)+fig(head=(150,72),sh=(150,95),hip=(150,162),knee=(150,200),foot=(145,240),elb=(152,128),hand=(152,160))+db(152,165))
ex('hip-thrust','היפ תראסט','רגליים',bench(40,180,70)+fig(head=(80,165),sh=(100,175),hip=(160,170),knee=(205,170),foot=(212,255),elb=(130,160),hand=(155,160))+bar_side(158,155))
# ---------- ABS ----------
ex('crunch','כפיפות בטן','בטן',R(40,250,220,6,'#64748b',3)+fig(head=(105,200),sh=(118,212),hip=(165,245),knee=(200,205),foot=(235,245),elb=(98,198),hand=(102,188)))
ex('plank','פלאנק','בטן',R(30,250,240,6,'#64748b',3)+fig(head=(78,195),sh=(95,205),hip=(170,215),knee=(205,228),foot=(240,245),elb=(98,245),hand=(120,248)))
ex('leg-raise','הרמת רגליים','בטן',L((60,40),(240,40),MET,7)+fig(head=(150,70),sh=(150,90),hip=(150,155),knee=(195,150),foot=(235,145),elb=(130,68),hand=(130,42),fararm=((170,68),(170,42))))
for id,n,g,s in E: open(os.path.join(OUT,id+'.svg'),'w').write(s)
# RETIRED: library.js is maintained by hand + tools/build_assets.py (it contains entries such as
# 'oblique-crunch' and APP_VERSION that this script does not know about). This script now only writes SVG fallbacks.
print(len(E),'svg fallbacks written; library.js untouched')
