#file associating area labels to boxes in the 32 by 32 grid where box (0,0) has its origin at xmin,ymin

Num_Box =32

radiant_base = [[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],\
[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],\
[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],\
[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],[3,8],[3,9],[3,10],\
[4,2],[4,3],[4,4],[4,5],[4,6],[4,7],[4,8],[4,9],[4,10],\
[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],\
[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],[6,9],\
[7,2],[7,3],[7,4],[7,5],[7,6],[7,7],[7,8],\
[8,2],[8,3],[8,4],[8,5],[8,6],[8,7],[9,2]]

top_one = [[1,11],[1,12],[1,13],[2,11],[2,12],[2,13],[3,11],[3,12],[3,13]]

top_two = [[1,14],[1,15],[1,16],[1,17],[1,18],[1,19],[1,20],\
[2,14],[2,15],[2,16],[2,17],[2,18],[2,19],[2,20],\
[3,14],[3,15],[3,16],[3,17],[3,18],[3,19],[3,20]]

top_three = [[1,21],[1,22],[1,23],[1,24],[1,25],[1,26],[1,27],[2,21],[2,22],[2,23],[2,24],[2,25],[2,26],[2,27],[2,28],\
[3,21],[3,22],[3,23],[3,24],[3,25],[3,26],[3,27],[3,28],[3,29],[4,27],[4,28],[4,29],\
[5,27],[5,28],[5,29]]

top_four = [[6,27],[6,28],[6,29],[7,27],[7,28],[7,29],\
[8,27],[8,28],[8,29],[9,27],[9,28],[9,29],[10,27],[10,28],[10,29],\
[11,27],[11,28],[11,29],[12,27],[12,28],[12,29],[13,27],[13,28],[13,29],\
[14,27],[14,28],[14,29]]

top_five = [[15,27],[15,28],[15,29],[16,27],[16,28],[16,29],\
[17,27],[17,28],[17,29],[18,27],[18,28],[18,29],[19,27],[19,28],[19,29],[20,27],[20,28],[20,29],[21,27],[21,28],[21,29]]

mid_one = [[7,9],[7,10],[8,9],[8,10],[9,9],[9,10],[10,10]]

mid_two = [[8,11],[9,11],[9,12],[10,11],[10,12],[10,13],[11,11],[11,12],[11,13],[11,14],\
[12,12],[12,13],[12,14],[12,15],[13,13],[13,14]]

mid_three = [[13,15],[13,16],[14,14],[14,15],[14,16],[14,17],[15,14],[15,15],[15,16],[15,17],[15,18],[16,15],[16,16],[16,17],\
[17,15],[17,16]]

mid_four =[[16,18],[17,17],[17,18],[18,17],[18,18],[18,19],[19,18],[19,19],[19,20],\
[20,19]]

mid_five =[[20,20],[20,21],[21,20],[21,21],[21,22],[22,21],[22,22],[22,23],[23,22]]

bot_one =[[9,3],[9,4],[10,3],[10,4],[11,3],[11,4],[12,3],[12,4],[13,3],[13,4],\
[14,3],[14,4]]

bot_two =[[15,3],[15,4],[16,3],[16,4],[17,3],[17,4],[18,3],[18,4],[19,3],[19,4],\
[20,3],[20,4],[21,3],[21,4],[22,3],[22,4],[23,3],[23,4],[24,3],[24,4],\
[25,3],[25,4],[25,3],[25,4],[25,5]]

bot_three =[[26,3],[26,4],[26,5],[26,6],[26,7],\
[27,3],[27,4],[27,5],[27,6],[27,7],[27,8],[27,9],[27,10],[27,11],\
[28,4],[28,5],[28,6],[28,7],[28,8],[28,9],[28,10],[28,11],
[29,6],[29,7],[29,8],[29,9],[29,10],[29,11],[30,8]]

bot_four =[[27,12],[27,13],[27,14],[27,15],[27,16],\
[28,12],[28,13],[28,14],[28,15],[28,16],\
[29,12],[29,13],[29,14],[29,15],[29,16]]

bot_five =[[27,17],[27,18],[27,19],[27,20],\
[28,17],[28,18],[28,19],[28,20],\
[29,17],[29,18],[29,19],[29,20]]

dire_base = [[22,24],[22,25],[22,26],[22,27],[22,28],[22,29],[22,30],\
[23,23],[23,24],[23,25],[23,26],[23,27],[23,28],[23,29],[23,30],\
[24,22],[24,23],[24,24],[24,25],[24,26],[24,27],[24,28],[24,29],[24,30],\
[25,22],[25,23],[25,24],[25,25],[25,26],[25,27],[25,28],[25,29],[25,30],\
[26,21],[26,22],[26,23],[26,24],[26,25],[26,26],[26,27],[26,28],[26,29],[26,30],\
[27,21],[27,22],[27,23],[27,24],[27,25],[27,26],[27,27],[27,28],[27,29],[27,30],\
[28,21],[28,22],[28,23],[28,24],[28,25],[28,26],[28,27],[28,28],[28,29],[28,30],\
[29,21],[29,22],[29,23],[29,24],[29,25],[29,26],[29,27],[29,28],[29,29],[29,30],\
[30,21],[30,22],[30,23],[30,24],[30,25],[30,26],[30,27],[30,28],[30,29],[30,30]]

dire_jungle =[[5,23],[5,24],[5,25],[6,23],[6,24],[6,25],[7,23],[7,24],[7,25],\
[8,23],[8,24],[8,25],[9,23],[9,24],[9,25],[10,23],[10,24],[10,25],\
[11,23],[11,24],[11,25],[12,21],[12,22],[12,23],[12,24],[12,25],\
[13,21],[13,22],[13,23],[13,24],[13,25],[14,21],[14,22],[14,23],[14,24],[14,25],\
[15,20],[15,21],[15,22],[15,23],[15,24],[15,25],[16,20],[16,21],[16,22],[16,23],[16,24],[16,25],\
[17,22],[17,23],[17,24],[17,25],[18,23],[18,24]]

radiant_jungle = [[12,8],[12,9],[13,7],[13,8],[13,9],[13,10],\
[14,6],[14,7],[14,8],[14,9],[14,10],[14,11],[15,6],[15,7],[15,8],[15,9],[15,10],[15,11],[15,12],\
[16,6],[16,7],[16,8],[16,9],[16,10],[16,11],[16,12],\
[17,6],[17,7],[17,8],[17,9],[17,10],[17,11],[18,6],[18,7],[18,8],[18,9],[18,10],[18,11],\
[19,6],[19,7],[19,8],[19,9],[19,10],[20,6],[20,7],[20,8],[20,9],\
[21,6],[21,7],[21,8],[21,9],[21,10],[22,6],[22,7],[22,8],[22,9],[22,10],\
[23,6],[23,7],[23,8],[23,9],[24,7],[24,8],[24,9],[25,8],[25,9]]

dire_secret = [[21,17],[22,16],[22,17],[22,18],[23,16],[23,17],[23,18],\
[24,16],[24,17],[25,16],[25,17]]

radiant_secret = [[5,17],[6,17],[6,18],[6,19],[6,20],[7,15],[7,16],[7,17],[7,18],[7,19],[7,20],\
[8,14],[8,15],[8,18],[8,19],[8,20],[9,19],[9,20]]

radiant_ancient = [[9,16],[9,17],[10,15],[10,16],[10,17],[11,16]]

top_rune = [[10,19],[10,20],[11,18],[11,19],[11,20],[12,18],[12,19]]

bottom_rune = [[20,12],[21,11],[21,12],[22,11],[22,12]]

roshan = [[23,12],[23,13],[24,12],[24,13]]

dire_ancient = [[19,14],[19,15],[20,14],[20,15],[21,14],[21,15],[22,14],[22,15],[23,14],[23,15],[24,14],[24,15]]

areas = {"RA":radiant_ancient,"RS":radiant_secret,"DS":dire_secret,"RJ":radiant_jungle,"DJ":dire_jungle, "T1":top_one,"T2":top_two,"T3":top_three,"T4":top_four,"T5":top_five, "DB":dire_base,"M1":mid_one, "M2":mid_two,"M3":mid_three, "M4":mid_four, "M5":mid_five, "B1":bot_one,"B2":bot_two, "B3":bot_three, "B4":bot_four, "B5":bot_five, "RB":radiant_base,"TR":top_rune,"BR":bottom_rune,"RH":roshan,"DA":dire_ancient}

area_matrix = [[0 for i in range(Num_Box)] for i in range(Num_Box)] 

for key in areas:
	for elem in areas[key]:
		area_matrix[Num_Box-1-elem[1]][elem[0]] = key

